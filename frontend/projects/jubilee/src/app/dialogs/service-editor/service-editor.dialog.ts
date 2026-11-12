import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CATALOGUE_API, OwnerService, ServicePricing } from 'api';
import {
  Button,
  Alert,
  Field,
  Input,
  Select,
  Checkbox,
  DialogFrame,
  DialogBody,
  DialogFooter,
} from 'components';
import { timeout } from 'rxjs';
import { failureText, guardClose } from '../guard-close';
import { FormDraftDirective } from '../../drafts/form-draft.directive';

export interface ServiceEditorData {
  /** The service to change; null adds one. */
  service: OwnerService | null;
}

export interface ServiceSaved {
  service: OwnerService;
  created: boolean;
}

type View = 'form' | 'busy' | 'failed' | 'discard';

type FieldName = 'name' | 'detail' | 'price' | 'duration' | 'modes' | 'place';

const SAVE_TIMEOUT_MS = 10_000;

/** ServiceEditorDialog (L2-094): add or change a service, its price and how members can ask for it. */
@Component({
  selector: 'jb-service-editor-dialog',
  imports: [
    FormDraftDirective,
    FormsModule,
    Button,
    Alert,
    Field,
    Input,
    Select,
    Checkbox,
    DialogFrame,
    DialogBody,
    DialogFooter,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './service-editor.dialog.html',
})
export class ServiceEditorDialog {
  private readonly ref = inject<DialogRef<ServiceSaved>>(DialogRef);
  private readonly api = inject(CATALOGUE_API);
  protected readonly data = inject<ServiceEditorData>(DIALOG_DATA);

  private readonly key = crypto.randomUUID();
  private readonly service = this.data.service;

  protected readonly editing = this.service !== null;
  protected readonly view = signal<View>('form');
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly failure = signal('');
  protected readonly errors = signal<Partial<Record<FieldName, string>>>({});

  protected readonly name = signal(this.service?.name ?? '');
  protected readonly detail = signal(this.service?.detail ?? '');
  protected readonly pricing = signal<ServicePricing>(this.service?.priceKind ?? 'free');
  protected readonly price = signal(
    this.service?.priceCents != null ? (this.service.priceCents / 100).toFixed(2) : '',
  );
  protected readonly action = signal<'book' | 'ask'>(this.service?.action ?? 'ask');
  protected readonly duration = signal(this.service?.durationMinutes?.toString() ?? '30');
  protected readonly video = signal(this.service?.offersVideo ?? true);
  protected readonly inPerson = signal(this.service?.offersInPerson ?? false);
  protected readonly place = signal(this.service?.inPersonPlace ?? '');

  private readonly snapshot = () =>
    [
      this.name(),
      this.detail(),
      this.pricing(),
      this.price(),
      this.action(),
      this.duration(),
      this.video(),
      this.inPerson(),
      this.place(),
    ].join('\u0000');

  private readonly initial = this.snapshot();
  protected readonly dirty = computed(() => this.snapshot() !== this.initial);

  constructor() {
    guardClose(this.ref, inject(DestroyRef), () => this.close());
  }

  /** The price is hidden and cleared unless it is a fixed price (L2-094 AC2). */
  protected setPricing(value: ServicePricing): void {
    this.pricing.set(value);
    if (value !== 'amount') {
      this.price.set('');
      this.errors.update((errors) => ({ ...errors, price: undefined }));
    }
  }

  protected save(): void {
    if (this.busy()) return;
    const problems = this.check();
    this.errors.set(problems);
    if (Object.keys(problems).length > 0) {
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    this.view.set('busy');
    const books = this.action() === 'book';
    this.api
      .saveService(this.service?.id ?? null, {
        name: this.name().trim(),
        detail: this.detail().trim(),
        pricing: this.pricing(),
        price: this.pricing() === 'amount' ? this.price().trim() : '',
        action: this.action(),
        durationMinutes: books ? Number(this.duration()) : null,
        offersVideo: books ? this.video() : true,
        offersInPerson: books && this.inPerson(),
        place: books && this.inPerson() ? this.place().trim() : '',
        idempotencyKey: this.key,
      })
      .pipe(timeout(SAVE_TIMEOUT_MS))
      .subscribe({
        next: (saved) => this.ref.close({ service: saved, created: !this.editing }),
        error: (error: unknown) => this.failed(error),
      });
  }

  private failed(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const fields = (error.error as { errors?: Record<string, string> } | null)?.errors ?? {};
      this.errors.set(this.serverProblems(fields));
      this.view.set('form');
      return;
    }
    const status = error instanceof HttpErrorResponse ? error.status : undefined;
    const detail =
      error instanceof HttpErrorResponse && error.status === 409
        ? (error.error as { detail?: string } | null)?.detail
        : undefined;
    this.failure.set(detail ?? failureText(status, 'service'));
    this.view.set('failed');
  }

  private check(): Partial<Record<FieldName, string>> {
    const problems: Partial<Record<FieldName, string>> = {};
    if (!this.name().trim()) problems.name = 'Enter a name for the service.';
    if (this.pricing() === 'amount') {
      const price = this.price().trim();
      if (!/^\d{1,6}(\.\d{1,2})?$/.test(price) || Number(price) < 0.01 || Number(price) > 100000) {
        problems.price = 'Enter a price in dollars, like 8.00.';
      }
    }
    if (this.action() === 'book') {
      const minutes = Number(this.duration());
      if (!Number.isInteger(minutes) || minutes < 15 || minutes > 480) {
        problems.duration = 'Enter a length from 15 to 480 minutes.';
      }
      if (!this.video() && !this.inPerson()) problems.modes = 'Choose video, in person or both.';
      else if (this.inPerson() && !this.place().trim()) problems.place = 'Enter where you meet.';
    }
    return problems;
  }

  private serverProblems(fields: Record<string, string>): Partial<Record<FieldName, string>> {
    const text: Record<string, string> = {
      name: 'Enter a name for the service.',
      detail: 'Shorten this to 60 characters.',
      price: 'Enter a price in dollars, like 8.00.',
      duration: 'Enter a length from 15 to 480 minutes.',
      modes: 'Choose video, in person or both.',
      place: 'Enter where you meet.',
    };
    return Object.fromEntries(
      Object.keys(fields)
        .filter((key) => key in text)
        .map((key) => [key, text[key]]),
    );
  }

  protected close(): void {
    if (this.busy()) return;
    if (this.view() === 'discard') {
      this.view.set('form');
      return;
    }
    if (this.dirty()) {
      this.view.set('discard');
      setTimeout(() => document.querySelector<HTMLElement>('.dialog__footer .btn')?.focus());
    } else this.ref.close();
  }

  protected keepEditing(): void {
    this.view.set('form');
  }

  protected discard(): void {
    this.ref.close();
  }
}
