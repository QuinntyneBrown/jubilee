import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LAUNCH_API } from 'api';
import {
  Alert,
  BotChallenge,
  Checkbox,
  Field,
  FieldError,
  FormSummary,
  Input,
  LaunchConfirmation,
  LaunchForm,
  MarketingButton,
  MarketingHeading,
  MarketingSection,
  Select,
  Textarea,
} from 'components';
import { map } from 'rxjs';
import {
  challengeFailed,
  EMAIL_INVALID,
  EMAIL_PATTERN,
  FormNotice,
  keepSending,
  ROBOT,
  STILL_SENDING,
  TOO_LONG,
  tooMany,
} from '../launch-forms/launch-messages';
import { CATEGORIES } from '../content';

type FieldName =
  | 'businessName'
  | 'contactName'
  | 'email'
  | 'phone'
  | 'category'
  | 'area'
  | 'website'
  | 'description'
  | 'consent';
type View = 'form' | 'sending' | 'sent';

const MAX = {
  businessName: 80,
  contactName: 100,
  email: 254,
  area: 80,
  website: 200,
  description: 500,
};
/** The fields in the order of the form, with the id the summary links to. */
const IDS: Record<FieldName, string> = {
  businessName: 'business-name',
  contactName: 'business-contact',
  email: 'business-email',
  phone: 'business-phone',
  category: 'business-category',
  area: 'business-area',
  website: 'business-website',
  description: 'business-about',
  consent: 'business-consent',
};
const REQUIRED: Partial<Record<FieldName, string>> = {
  businessName: 'Enter your business’s name.',
  contactName: 'Enter your name.',
  email: 'Enter your e-mail address.',
  category: 'Choose a category.',
  area: 'Enter the area of Toronto you work in.',
  description: 'Describe your business in a sentence or two.',
  consent: 'Tick the box so that we may contact you.',
};
const SUMMARY: Record<FieldName, string> = {
  businessName: 'Enter your business’s name',
  contactName: 'Enter your name',
  email: 'Enter a valid e-mail address',
  phone: 'Enter a 10-digit phone number',
  category: 'Choose a category',
  area: 'Enter the area of Toronto you work in',
  website: 'Enter a web address',
  description: 'Describe your business in a sentence or two',
  consent: 'Say yes so that we may contact you',
};
const PHONE_INVALID = 'Enter a 10-digit phone number, or leave this empty.';
const WEBSITE_INVALID = 'Enter a web address, like example.com, or leave this empty.';

/** The text of a field error, by the code the API answers with (L2-216 AC2, AC3). */
function message(field: FieldName, code: string): string {
  switch (code) {
    case 'TOO_LONG':
      return TOO_LONG;
    case 'EMAIL_INVALID':
      return EMAIL_INVALID;
    case 'PHONE_INVALID':
      return PHONE_INVALID;
    case 'WEBSITE_INVALID':
      return WEBSITE_INVALID;
    case 'CATEGORY_UNKNOWN':
      return 'Choose a category.';
    default:
      return REQUIRED[field] ?? 'Check this and try again.';
  }
}

/** Ten digits, with an eleventh leading 1 allowed (L2-216 AC3); the server checks it again. */
function phoneValid(phone: string): boolean {
  if (/\p{L}/u.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

/** An `http` or `https` address, or a bare host name taken as one (L2-136 AC5). */
function websiteValid(website: string): boolean {
  if (/\s/.test(website)) return false;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(website) ? website : `https://${website}`;
  try {
    const url = new URL(candidate);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

/**
 * "Be listed on launch day.": an owner sends their business's details before launch, so that the
 * Jubilee team can prepare the listing (L2-216). Sending lists and verifies nothing.
 */
@Component({
  selector: 'jb-business-pre-registration',
  imports: [
    FormsModule,
    MarketingSection,
    MarketingHeading,
    LaunchForm,
    LaunchConfirmation,
    MarketingButton,
    Alert,
    FormSummary,
    Field,
    FieldError,
    Input,
    Select,
    Textarea,
    Checkbox,
    BotChallenge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './business-pre-registration.html',
})
export class BusinessPreRegistration {
  private readonly api = inject(LAUNCH_API);
  private readonly summaryRef = viewChild(FormSummary);
  private readonly confirmationRef = viewChild(LaunchConfirmation);
  private readonly challengeRef = viewChild(BotChallenge);

  protected readonly max = MAX;
  protected readonly categories = CATEGORIES;
  protected readonly view = signal<View>('form');
  protected readonly sending = computed(() => this.view() === 'sending');
  protected readonly businessName = signal('');
  protected readonly contactName = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly category = signal('');
  protected readonly area = signal('');
  protected readonly website = signal('');
  protected readonly description = signal('');
  protected readonly consent = signal(false);
  protected readonly errors = signal<Partial<Record<FieldName, string>>>({});
  protected readonly notice = signal<FormNotice | null>(null);
  protected readonly sentTo = signal('');
  /** The bot challenge, when one is configured (L2-218 AC5). */
  protected readonly challengeSiteKey = toSignal(
    this.api.settings().pipe(map((settings) => settings.botChallengeSiteKey ?? null)),
    { initialValue: null },
  );
  protected readonly challenge = signal<string | null>(null);

  protected readonly summary = computed(() => {
    const errors = this.errors();
    return (Object.keys(IDS) as FieldName[])
      .filter((field) => errors[field])
      .map((field) => ({ id: IDS[field], text: SUMMARY[field] }));
  });

  protected send(event: Event): void {
    event.preventDefault();
    if (this.sending()) return;
    const errors = this.check();
    this.errors.set(errors);
    this.notice.set(null);
    if (Object.keys(errors).length > 0) {
      this.focusSummary();
      return;
    }

    const email = this.email().trim();
    this.view.set('sending');
    this.api
      .preRegister({
        businessName: this.businessName().trim(),
        contactName: this.contactName().trim(),
        email,
        phone: this.phone().trim(),
        category: this.category(),
        area: this.area().trim(),
        website: this.website().trim(),
        description: this.description().trim(),
        consent: true,
        challengeToken: this.challenge(),
      })
      .pipe(keepSending(() => this.notice.set(STILL_SENDING)))
      .subscribe({
        next: () => {
          this.sentTo.set(email);
          this.view.set('sent');
          setTimeout(() => this.confirmationRef()?.focus());
        },
        error: (error: unknown) => this.failed(error),
      });
  }

  /** The rules of L2-216 AC2 and AC3, as the server enforces them. */
  private check(): Partial<Record<FieldName, string>> {
    const errors: Partial<Record<FieldName, string>> = {};
    const required: FieldName[] = ['businessName', 'contactName', 'email', 'area', 'description'];
    const values: Record<FieldName, string> = {
      businessName: this.businessName().trim(),
      contactName: this.contactName().trim(),
      email: this.email().trim(),
      phone: this.phone().trim(),
      category: this.category(),
      area: this.area().trim(),
      website: this.website().trim(),
      description: this.description().trim(),
      consent: '',
    };
    for (const field of required) {
      if (!values[field]) errors[field] = message(field, 'REQUIRED');
    }
    if (values.email && !EMAIL_PATTERN.test(values.email)) {
      errors.email = message('email', 'EMAIL_INVALID');
    }
    if (values.phone && !phoneValid(values.phone)) errors.phone = PHONE_INVALID;
    if (!values.category) errors.category = message('category', 'REQUIRED');
    if (values.website && !websiteValid(values.website)) errors.website = WEBSITE_INVALID;
    if (!this.consent()) errors.consent = message('consent', 'CONSENT_REQUIRED');
    return errors;
  }

  /** An answer the visitor can act on: every value typed stays where it was (L2-216 AC6 to AC8). */
  private failed(error: unknown): void {
    this.view.set('form');
    this.notice.set(null);
    if (challengeFailed(error)) {
      // One token passes one check: ask for a fresh one (L2-137 AC2).
      this.challenge.set(null);
      this.challengeRef()?.reset();
      this.notice.set(ROBOT);
    } else if (error instanceof HttpErrorResponse && error.status === 422 && error.error?.errors) {
      const mapped: Partial<Record<FieldName, string>> = {};
      for (const [key, code] of Object.entries<string>(error.error.errors)) {
        if (key in IDS) mapped[key as FieldName] = message(key as FieldName, code);
      }
      this.errors.set(mapped);
      this.focusSummary();
    } else if (error instanceof HttpErrorResponse && error.status === 429) {
      this.notice.set(tooMany(error));
    }
  }

  private focusSummary(): void {
    setTimeout(() => this.summaryRef()?.focus());
  }
}
