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
import { CATALOGUE_API, DraftItem, OwnerProduct, ProductPhoto } from 'api';
import {
  Button,
  Alert,
  Field,
  FieldError,
  Icon,
  IconName,
  Input,
  MediaTile,
  Textarea,
  TileTint,
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

type FieldName = 'name' | 'price' | 'stock' | 'description' | 'minimumQuantity' | 'options';

/** One option as the editor holds it: its name and stock as typed, and a key for the list. */
interface OptionDraft {
  id: number;
  label: string;
  stock: string;
}

/** A product has at most this many options (L2-091 AC8). */
const MAX_OPTIONS = 10;

/** A submission that takes longer than this fails rather than spinning (L2-127 AC2). */
const SAVE_TIMEOUT_MS = 10_000;

/** The largest photo the server takes (L2-138 AC1); a larger one is refused before it is sent. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** What a refused photo says, by the code of the server's answer (L2-091 AC9). */
const PHOTO_PROBLEMS: Record<string, string> = {
  TOO_LARGE: 'Photos can be 5 MB at most.',
  NOT_AN_IMAGE: 'Add a JPG or PNG photo.',
  TOO_BIG_IN_PIXELS: 'Photos can be 8,000 by 8,000 pixels at most.',
  FAILED_SCAN: 'This photo didn’t pass our safety check.',
};

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
    FieldError,
    Icon,
    Input,
    MediaTile,
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
  protected readonly maxOptions = MAX_OPTIONS;
  private nextOption = 0;
  /** "Minimum order" as typed; empty is 1 (L2-091 AC8). */
  protected readonly minimum = signal(
    this.product && this.product.minimumQuantity > 1 ? `${this.product.minimumQuantity}` : '',
  );
  protected readonly optionName = signal(this.product?.optionName ?? '');
  protected readonly options = signal<OptionDraft[]>(
    (this.product?.options ?? []).map((option) => ({
      id: this.nextOption++,
      label: option.label,
      stock: option.stock?.toString() ?? '',
    })),
  );
  protected readonly optionsHint = computed(() =>
    this.options().length >= MAX_OPTIONS
      ? '10 options is the most a product can have.'
      : 'Sizes or colours, each with its own stock.',
  );

  /** The tile beside "Add photo" until a photo fills it. */
  protected readonly tint = (this.product?.tint ?? 'gold') as TileTint;
  protected readonly icon = (this.product?.icon ?? 'bag') as IconName;
  /** The photo the product shows when it is saved (L2-091 AC9). */
  protected readonly photo = signal<ProductPhoto | null>(this.product?.photo ?? null);
  protected readonly uploading = signal(false);
  protected readonly photoError = signal<string | null>(null);

  private readonly values = () =>
    [
      this.name(),
      this.price(),
      this.stock(),
      this.description(),
      this.photo()?.id ?? '',
      this.minimum(),
      this.optionName(),
      ...this.options().flatMap((option) => [option.label, option.stock]),
    ].join('\u0000');

  private readonly initial = this.values();

  protected readonly dirty = computed(() => this.values() !== this.initial);

  constructor() {
    guardClose(this.ref, inject(DestroyRef), () => this.close());
  }

  /** Uploads the chosen photo at once; a refusal is told beside the button and nothing else changes. */
  protected choosePhoto(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      this.photoError.set(PHOTO_PROBLEMS['TOO_LARGE']);
      return;
    }
    this.photoError.set(null);
    this.uploading.set(true);
    this.api.uploadProductPhoto(file).subscribe({
      next: (photo) => {
        this.uploading.set(false);
        this.photo.set(photo);
      },
      error: (error: unknown) => {
        this.uploading.set(false);
        const code =
          error instanceof HttpErrorResponse
            ? (error.error as { code?: string } | null)?.code
            : undefined;
        this.photoError.set(PHOTO_PROBLEMS[code ?? ''] ?? 'We couldn’t add the photo. Try again.');
      },
    });
  }

  /** Adds an empty option and puts the cursor in its name. */
  protected addOption(): void {
    if (this.options().length >= MAX_OPTIONS) return;
    const option = { id: this.nextOption++, label: '', stock: '' };
    this.options.update((options) => [...options, option]);
    setTimeout(() => document.getElementById(`d-opt-${option.id}`)?.focus());
  }

  protected removeOption(index: number): void {
    this.options.update((options) => options.filter((_, i) => i !== index));
  }

  protected setOption(index: number, change: Partial<OptionDraft>): void {
    this.options.update((options) =>
      options.map((option, i) => (i === index ? { ...option, ...change } : option)),
    );
  }

  protected removePhoto(): void {
    this.photo.set(null);
    this.photoError.set(null);
  }

  protected save(): void {
    if (this.busy() || this.uploading()) return;
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
    const options = this.options().map((option) => ({
      label: option.label.trim(),
      stock: option.stock.trim() === '' ? null : Number(option.stock.trim()),
    }));
    const minimum = this.minimum().trim();
    this.api
      .saveProduct(this.product?.id ?? null, {
        name: this.name().trim(),
        price: this.price().trim(),
        stock: options.length > 0 || stock === '' ? null : Number(stock),
        description: this.description().trim(),
        minimumQuantity: minimum === '' ? 1 : Number(minimum),
        optionName: options.length > 0 ? this.optionName().trim() || null : null,
        options,
        idempotencyKey: this.key,
        photoId: this.photo()?.id ?? null,
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
    if (
      this.options().length === 0 &&
      stock !== '' &&
      (!/^\d{1,4}$/.test(stock) || Number(stock) > 9999)
    ) {
      problems.stock = 'Enter a whole number from 0 to 9,999, or leave it empty.';
    }
    if (!this.data.draft) {
      const minimum = this.minimum().trim();
      if (minimum !== '' && (!/^\d{1,3}$/.test(minimum) || Number(minimum) < 1)) {
        problems.minimumQuantity = 'Enter a whole number from 1 to 999.';
      }
      const names = this.options().map((option) => option.label.trim().toLowerCase());
      const stocks = this.options().map((option) => option.stock.trim());
      if (names.some((name) => name === '') || new Set(names).size !== names.length) {
        problems.options = 'Give each option its own name.';
      } else if (stocks.some((value) => value !== '' && !/^\d{1,4}$/.test(value))) {
        problems.options = 'Give each option a stock from 0 to 9,999, or leave it empty.';
      }
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
      minimumQuantity: 'Enter a whole number from 1 to 999.',
      options: 'Give each option its own name.',
      optionName: 'Name what the options choose in 40 characters or fewer.',
    };
    // A photo the server would not take is told beside the photo, not as a field (L2-091 AC9).
    if (fields['photo']) this.photo.set(null);
    if (fields['photo']) this.photoError.set('We couldn’t add the photo. Try again.');
    return Object.fromEntries(
      Object.keys(fields)
        .filter((key) => key in text)
        .map((key) => [key === 'optionName' ? 'options' : key, text[key]]),
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
