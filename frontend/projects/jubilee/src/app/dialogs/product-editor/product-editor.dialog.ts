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
import { CATALOGUE_API, DraftItem, OwnerProduct } from 'api';
import {
  Button,
  Alert,
  Field,
  Input,
  Textarea,
  DialogFrame,
  DialogBody,
  DialogFooter,
} from 'components';
import { timeout } from 'rxjs';
import { failureText, guardClose } from '../guard-close';
import { FormDraftDirective } from '../../drafts/form-draft.directive';

export interface ProductEditorData {
  /** The product to change; null adds one. */
  product: OwnerProduct | null;
  /**
   * On List your business no listing exists yet (L2-073 AC1): the editor checks its fields, calls
   * no API and closes with the product as a `DraftItem`, which the page keeps with the draft.
   */
  draft?: boolean;
}

export interface ProductSaved {
  product: OwnerProduct;
  created: boolean;
}

type View = 'form' | 'busy' | 'failed' | 'discard';

type FieldName = 'name' | 'price' | 'stock' | 'description';

/** A submission that takes longer than this fails rather than spinning (L2-127 AC2). */
const SAVE_TIMEOUT_MS = 10_000;

/**
 * ProductEditorDialog (L2-091): add or change a product; it is live on the listing as soon as it
 * is saved. Opened with `draft`, it adds a product to a listing that is still being written.
 */
@Component({
  selector: 'jb-product-editor-dialog',
  imports: [
    FormDraftDirective,
    FormsModule,
    Button,
    Alert,
    Field,
    Input,
    Textarea,
    DialogFrame,
    DialogBody,
    DialogFooter,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-editor.dialog.html',
})
export class ProductEditorDialog {
  private readonly ref = inject<DialogRef<ProductSaved | DraftItem>>(DialogRef);
  private readonly api = inject(CATALOGUE_API);
  protected readonly data = inject<ProductEditorData>(DIALOG_DATA);

  /** One key for every try of this dialog, so a retry never adds the product twice (L2-132). */
  private readonly key = crypto.randomUUID();
  private readonly product = this.data.product;

  protected readonly editing = this.product !== null;
  /** When what is saved becomes public. */
  protected readonly note = this.data.draft
    ? 'Nothing is public until your listing is published.'
    : 'Changes show on your public listing as soon as you save.';
  protected readonly view = signal<View>('form');
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly failure = signal('');
  protected readonly errors = signal<Partial<Record<FieldName, string>>>({});

  protected readonly name = signal(this.product?.name ?? '');
  protected readonly price = signal(this.product ? (this.product.priceCents / 100).toFixed(2) : '');
  protected readonly stock = signal(this.product?.stock?.toString() ?? '');
  protected readonly description = signal(this.product?.description ?? '');
  protected readonly hasOptions = (this.product?.options.length ?? 0) > 0;

  private readonly initial = [this.name(), this.price(), this.stock(), this.description()].join(
    '\u0000',
  );

  protected readonly dirty = computed(
    () =>
      [this.name(), this.price(), this.stock(), this.description()].join('\u0000') !== this.initial,
  );

  constructor() {
    guardClose(this.ref, inject(DestroyRef), () => this.close());
  }

  protected save(): void {
    if (this.busy()) return;
    const problems = this.check();
    this.errors.set(problems);
    if (Object.keys(problems).length > 0) {
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const stock = this.stock().trim();
    if (this.data.draft) {
      this.ref.close({
        name: this.name().trim(),
        detail: null,
        priceKind: 'amount',
        priceCents: Math.round(Number(this.price().trim()) * 100),
        description: this.description().trim() || null,
        stock: stock === '' ? null : Number(stock),
        action: 'ask',
        durationMinutes: null,
        offersVideo: true,
        offersInPerson: false,
        inPersonPlace: null,
      });
      return;
    }
    this.view.set('busy');
    this.api
      .saveProduct(this.product?.id ?? null, {
        name: this.name().trim(),
        price: this.price().trim(),
        stock: stock === '' ? null : Number(stock),
        description: this.description().trim(),
        idempotencyKey: this.key,
      })
      .pipe(timeout(SAVE_TIMEOUT_MS))
      .subscribe({
        next: (saved) => this.ref.close({ product: saved, created: !this.editing }),
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
    if (error instanceof HttpErrorResponse && error.status === 409) {
      const detail = (error.error as { detail?: string } | null)?.detail;
      this.failure.set(detail ?? failureText(error.status, 'product'));
      this.view.set('failed');
      return;
    }
    this.failure.set(
      failureText(error instanceof HttpErrorResponse ? error.status : undefined, 'product'),
    );
    this.view.set('failed');
  }

  private check(): Partial<Record<FieldName, string>> {
    const problems: Partial<Record<FieldName, string>> = {};
    if (!this.name().trim()) problems.name = 'Enter a name for the product.';
    if (
      !/^\d{1,6}(\.\d{1,2})?$/.test(this.price().trim()) ||
      Number(this.price()) < 0.01 ||
      Number(this.price()) > 100000
    ) {
      problems.price = 'Enter a price in dollars, like 24.00.';
    }
    const stock = this.stock().trim();
    if (stock !== '' && (!/^\d{1,4}$/.test(stock) || Number(stock) > 9999)) {
      problems.stock = 'Enter a whole number from 0 to 9,999, or leave it empty.';
    }
    // A draft has no server to refuse a long description, so the editor says it (L2-091).
    if (this.data.draft && this.description().trim().length > 1000) {
      problems.description = 'Shorten the description to 1,000 characters.';
    }
    return problems;
  }

  private serverProblems(fields: Record<string, string>): Partial<Record<FieldName, string>> {
    const text: Record<string, string> = {
      name: 'Enter a name for the product.',
      price: 'Enter a price in dollars, like 24.00.',
      stock: 'Enter a whole number from 0 to 9,999, or leave it empty.',
      description: 'Shorten the description to 1,000 characters.',
    };
    return Object.fromEntries(
      Object.keys(fields)
        .filter((key) => key in text)
        .map((key) => [key, text[key]]),
    );
  }

  /** Close, or ask first when something was typed (L2-130 AC3). */
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
