import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ACCOUNT_DATA_API, Account, PROFILE_API, ProfileForm } from 'api';
import {
  EmptyState,
  Icon,
  Button,
  Alert,
  FormSummary,
  Field,
  Input,
  Skeleton,
  InlineStatus,
  Card,
  Row,
  RowMeta,
  RowTitle,
  Rows,
  PageHeader,
  Tabs,
} from 'components';
import { Observable, map } from 'rxjs';
import { ChangeEmailData, ChangeEmailDialog } from '../../dialogs/change-email/change-email.dialog';
import {
  ChangePasswordData,
  ChangePasswordDialog,
} from '../../dialogs/change-password/change-password.dialog';
import { DeleteAccountDialog } from '../../dialogs/delete-account/delete-account.dialog';
import { LeaveUnsavedDialog } from '../../dialogs/leave-unsaved/leave-unsaved.dialog';
import { HasUnsavedChanges } from '../../guards/unsaved-changes.guard';
import { LoadState, errorReference } from 'api';
import { clockTime, dayLabel, fullDate, monthYear } from 'api';
import { SessionService } from '../../services/session.service';
import { ToastService } from 'components';
import { ACCOUNT_TABS } from './account-tabs';

type FieldName = 'firstName' | 'lastName' | 'phone' | 'postalCode';

interface Problem {
  field: FieldName;
  id: string;
  text: string;
}

const FIELD_IDS: Record<FieldName, string> = {
  firstName: 'first',
  lastName: 'last',
  phone: 'phone',
  postalCode: 'postal',
};

const MESSAGES: Record<string, string> = {
  'firstName:REQUIRED': 'Enter your first name.',
  'firstName:TOO_LONG': 'Use 50 characters or fewer.',
  'lastName:REQUIRED': 'Enter your last name.',
  'lastName:TOO_LONG': 'Use 50 characters or fewer.',
  'phone:PHONE_INVALID': 'Enter a 10-digit phone number, like 416-555-0142.',
  'postalCode:POSTAL_CODE_INVALID': 'Enter a full postal code, like M4C 1A1.',
};

/**
 * AccountPage at /account (L2-013, L2-014, L2-015): the profile form and the sign-in and
 * security rows. Editing the e-mail or the password opens a dialog. Leaving with unsaved changes
 * asks first.
 */
@Component({
  selector: 'jb-account-page',
  imports: [
    FormsModule,
    EmptyState,
    Icon,
    Button,
    Alert,
    FormSummary,
    Field,
    Input,
    Skeleton,
    InlineStatus,
    Card,
    Row,
    RowMeta,
    RowTitle,
    Rows,
    PageHeader,
    Tabs,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page', '(window:beforeunload)': 'warnOnClose($event)' },
  templateUrl: './account.page.html',
})
export class AccountPage implements OnInit, HasUnsavedChanges {
  protected readonly accountTabs = ACCOUNT_TABS;
  private readonly api = inject(PROFILE_API);
  private readonly dataApi = inject(ACCOUNT_DATA_API);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);
  private readonly session = inject(SessionService);
  private readonly toasts = inject(ToastService);
  private readonly summaryBox = viewChild(FormSummary);

  protected readonly state = signal<LoadState<Account>>({ status: 'loading' });
  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly phone = signal('');
  protected readonly postalCode = signal('');
  protected readonly homeChurch = signal('');
  protected readonly pronouns = signal('');
  protected readonly saving = signal(false);
  protected readonly problems = signal<Problem[]>([]);
  protected readonly failed = signal(false);
  protected readonly savedNow = signal<string | null>(null);

  protected readonly exportWaiting = signal(false);
  protected readonly exportBusy = signal(false);
  protected readonly exportFailed = signal(false);

  private readonly saved = signal<ProfileForm | null>(null);
  protected readonly account = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });

  protected readonly dirty = computed(() => {
    const saved = this.saved();
    if (!saved) return false;
    return JSON.stringify(this.current()) !== JSON.stringify(saved);
  });

  protected readonly subtitle = computed(() => {
    const account = this.account();
    return account
      ? `${account.firstName} ${account.lastName} · member since ${monthYear(account.memberSince)}`
      : 'Your profile and sign-in details.';
  });
  protected readonly lastSaved = computed(() => {
    const at = this.account()?.profileSavedAt;
    return at ? `Last saved ${dayLabel(at)}` : 'Not saved yet';
  });
  protected readonly passwordMeta = computed(() => {
    const account = this.account();
    if (!account) return '';
    if (!account.hasPassword) return 'You sign in with Google. You have not set a password.';
    return account.passwordChangedAt
      ? `Changed ${fullDate(account.passwordChangedAt)}`
      : 'Never changed';
  });

  ngOnInit(): void {
    this.load();
    // A request still waiting is shown as such after a reload; nothing else about it needs saying here.
    this.dataApi.currentDataExport().subscribe({
      next: (current) => this.exportWaiting.set(current.status === 'requested'),
      error: () => undefined,
    });
  }

  /** "Download my data": the archive is built in the background and the link arrives by e-mail (L2-018 AC1). */
  protected requestData(): void {
    if (this.exportBusy()) return;
    this.exportBusy.set(true);
    this.exportFailed.set(false);
    this.dataApi.requestDataExport().subscribe({
      next: () => {
        this.exportBusy.set(false);
        this.exportWaiting.set(true);
      },
      error: () => {
        this.exportBusy.set(false);
        this.exportFailed.set(true);
      },
    });
  }

  protected deleteAccount(opener: HTMLElement): void {
    this.dialog
      .open<boolean>(DeleteAccountDialog, {
        ariaLabelledBy: 'dlg-title',
        ariaDescribedBy: 'dlg-desc',
        ariaModal: true,
        backdropClass: 'backdrop',
        restoreFocus: opener,
      })
      .closed.subscribe((deleted) => {
        if (!deleted) return;
        // The session is over: becoming a visitor first keeps the welcome page from sending the member back.
        this.session.resolve().subscribe(() => {
          void this.router.navigateByUrl('/welcome').then(() =>
            this.toasts.show({
              tone: 'success',
              title: 'Your account was deleted',
              text: 'We sent you an e-mail to confirm. Your personal data is erased within 30 days.',
            }),
          );
        });
      });
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.api.getAccount().subscribe({
      next: (account) => {
        this.adopt(account);
        this.state.set({ status: 'loaded', value: account });
      },
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-ACC-503') }),
    });
  }

  private adopt(account: Account): void {
    this.firstName.set(account.firstName);
    this.lastName.set(account.lastName);
    this.phone.set(account.phone ?? '');
    this.postalCode.set(account.postalCode ?? '');
    this.homeChurch.set(account.homeChurch ?? '');
    this.pronouns.set(account.pronouns ?? '');
    this.saved.set(this.current());
  }

  private current(): ProfileForm {
    return {
      firstName: this.firstName().trim(),
      lastName: this.lastName().trim(),
      phone: this.phone().trim() || null,
      postalCode: this.postalCode().trim() || null,
      homeChurch: this.homeChurch().trim() || null,
      pronouns: this.pronouns().trim() || null,
    };
  }

  /** "Discard changes": back to what was last saved (L2-013). */
  protected discard(): void {
    const account = this.account();
    if (!account) return;
    this.adopt(account);
    this.problems.set([]);
    this.failed.set(false);
  }

  protected save(): void {
    if (this.saving()) return;
    const found = this.check();
    this.problems.set(found);
    this.savedNow.set(null);
    this.failed.set(false);
    if (found.length > 0) {
      this.focusSummary();
      return;
    }
    this.saving.set(true);
    this.api.saveProfile(this.current()).subscribe({
      next: (account) => {
        this.saving.set(false);
        this.adopt(account);
        this.state.set({ status: 'loaded', value: account });
        this.savedNow.set(
          `Saved today at ${clockTime(account.profileSavedAt ?? new Date().toISOString())}`,
        );
        // The menu and the header show the new name.
        this.session.resolve().subscribe();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.fail(error);
      },
    });
  }

  private check(): Problem[] {
    const found: Problem[] = [];
    const form = this.current();
    const add = (field: FieldName, code: string) =>
      found.push({ field, id: FIELD_IDS[field], text: MESSAGES[`${field}:${code}`] });
    if (!form.firstName) add('firstName', 'REQUIRED');
    if (!form.lastName) add('lastName', 'REQUIRED');
    if (form.phone && form.phone.replace(/\D/g, '').length !== 10) add('phone', 'PHONE_INVALID');
    if (form.postalCode && !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(form.postalCode))
      add('postalCode', 'POSTAL_CODE_INVALID');
    return found;
  }

  private fail(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const errors = (error.error as { errors?: Record<string, string> } | null)?.errors ?? {};
      const found: Problem[] = [];
      for (const field of Object.keys(FIELD_IDS) as FieldName[]) {
        if (errors[field])
          found.push({
            field,
            id: FIELD_IDS[field],
            text: MESSAGES[`${field}:${errors[field]}`] ?? 'Check this field.',
          });
      }
      this.problems.set(found);
      this.focusSummary();
      return;
    }
    this.failed.set(true);
  }

  protected problem(field: FieldName): string | null {
    return this.problems().find((p) => p.field === field)?.text ?? null;
  }

  private focusSummary(): void {
    setTimeout(() => this.summaryBox()?.focus());
  }

  protected changeEmail(opener: HTMLElement): void {
    const account = this.account();
    if (!account) return;
    this.dialog.open<void, ChangeEmailData>(ChangeEmailDialog, {
      data: { hasPassword: account.hasPassword },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
      restoreFocus: opener,
    });
  }

  protected changePassword(opener: HTMLElement): void {
    const account = this.account();
    if (!account) return;
    this.dialog
      .open<boolean, ChangePasswordData>(ChangePasswordDialog, {
        data: { hasPassword: account.hasPassword },
        ariaLabelledBy: 'dlg-title',
        ariaDescribedBy: 'dlg-desc',
        ariaModal: true,
        backdropClass: 'backdrop',
        restoreFocus: opener,
      })
      .closed.subscribe((changed) => {
        if (!changed) return;
        this.toasts.show({
          tone: 'success',
          title: 'Password changed',
          text: 'Your other devices were signed out and we sent you an e-mail.',
        });
        this.load();
      });
  }

  /** The leave guard (L2-013 AC6): unsaved changes ask before the member goes. */
  confirmLeave(): boolean | Observable<boolean> {
    if (!this.dirty()) return true;
    return this.dialog
      .open<boolean>(LeaveUnsavedDialog, {
        ariaLabelledBy: 'dlg-title',
        ariaDescribedBy: 'dlg-desc',
        ariaModal: true,
        backdropClass: 'backdrop',
      })
      .closed.pipe(map((leave) => leave === true));
  }

  protected warnOnClose(event: BeforeUnloadEvent): void {
    if (this.dirty()) event.preventDefault();
  }
}
