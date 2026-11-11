import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { REFERENCE_API, ReferenceAnswerValue, ReferenceRequestView } from 'api';
import {
  AuthLayout,
  Icon,
  Button,
  Alert,
  FormSummary,
  Field,
  Input,
  Textarea,
  RadioGroup,
  Skeleton,
} from 'components';

type FieldName = 'answer' | 'name' | 'role' | 'note';

const NOTE_LIMIT = 1000;

const MESSAGES: Record<string, string> = {
  ANSWER_REQUIRED: 'Choose one answer so we know how to treat this reference.',
  NAME_REQUIRED: 'Enter your name.',
  ROLE_REQUIRED: 'Enter your role at the church, like pastor or elder.',
  NOTE_TOO_LONG: `Shorten this to ${NOTE_LIMIT} characters.`,
};

/** ChurchReferencePage (L2-081, L2-082): a pastor or elder confirms or declines the owner, without an account. */
@Component({
  selector: 'jb-church-reference-page',
  imports: [
    FormsModule,
    RouterLink,
    AuthLayout,
    Icon,
    Button,
    Alert,
    FormSummary,
    Field,
    Input,
    Textarea,
    RadioGroup,
    Skeleton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './church-reference.page.html',
})
export class ChurchReferencePage {
  private readonly api = inject(REFERENCE_API);
  private readonly location = inject(Location);

  /** Read once, then taken out of the address bar and kept only in memory (L2-140). */
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  protected readonly noteLimit = NOTE_LIMIT;
  protected readonly state = signal<'loading' | 'form' | 'sent' | 'closed' | 'reported' | 'error'>(
    'loading',
  );
  protected readonly view = signal<ReferenceRequestView | null>(null);
  protected readonly closedText = signal('');

  protected readonly answer = signal<ReferenceAnswerValue | null>(null);
  protected readonly name = signal('');
  protected readonly role = signal('');
  protected readonly note = signal('');
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly codes = signal<Partial<Record<FieldName, string>>>({});
  protected readonly thanks = signal('');

  protected readonly problems = computed(() =>
    (['answer', 'name', 'role', 'note'] as FieldName[])
      .filter((field) => this.codes()[field])
      .map((field) => ({
        field,
        id: field === 'answer' ? 'know-0' : field,
        message: MESSAGES[this.codes()[field] ?? ''] ?? 'Check this answer.',
        text: this.summaryFor(field),
      })),
  );

  constructor() {
    inject(Meta).updateTag({ name: 'referrer', content: 'no-referrer' });
    this.location.replaceState('/reference');
    this.load();
  }

  private summaryFor(field: FieldName): string {
    const first = this.view()?.ownerFirstName ?? 'the owner';
    switch (field) {
      case 'answer':
        return `Choose how well you know ${first}`;
      case 'name':
        return 'Enter your name';
      case 'role':
        return 'Enter your role at the church';
      case 'note':
        return `Shorten your note to ${NOTE_LIMIT} characters`;
    }
  }

  protected load(): void {
    this.state.set('loading');
    this.api.open(this.token).subscribe({
      next: (view) => {
        this.view.set(view);
        this.state.set('form');
      },
      error: (error) => this.fail(error),
    });
  }

  private fail(error: unknown): void {
    if (error instanceof HttpErrorResponse && (error.status === 404 || error.status === 410)) {
      this.closedText.set(
        (error.error?.detail as string | undefined) ??
          'Reference links work once, for 14 days. If the owner still needs a reference, they can send you a new request from their listing.',
      );
      this.state.set('closed');
      return;
    }
    this.state.set('error');
  }

  protected send(): void {
    if (this.busy()) return;
    this.failed.set(false);
    const codes: Partial<Record<FieldName, string>> = {};
    if (!this.answer()) codes.answer = 'ANSWER_REQUIRED';
    if (!this.name().trim()) codes.name = 'NAME_REQUIRED';
    if (!this.role().trim()) codes.role = 'ROLE_REQUIRED';
    if (this.note().length > NOTE_LIMIT) codes.note = 'NOTE_TOO_LONG';
    this.codes.set(codes);
    if (Object.keys(codes).length) {
      setTimeout(() => document.getElementById('summary')?.focus());
      return;
    }
    this.busy.set(true);
    this.api
      .answer({
        token: this.token,
        answer: this.answer(),
        name: this.name().trim(),
        role: this.role().trim(),
        note: this.note().trim(),
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.thanks.set(this.name().trim());
          this.state.set('sent');
        },
        error: (error) => {
          this.busy.set(false);
          if (error instanceof HttpErrorResponse && error.status === 422 && error.error?.errors) {
            this.codes.set(error.error.errors as Partial<Record<FieldName, string>>);
            setTimeout(() => document.getElementById('summary')?.focus());
            return;
          }
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 404 || error.status === 410)
          ) {
            this.fail(error);
            return;
          }
          this.failed.set(true);
        },
      });
  }

  protected report(): void {
    this.api.report(this.token).subscribe({
      next: () => this.state.set('reported'),
      error: (error) => this.fail(error),
    });
  }

  protected clear(field: FieldName): void {
    if (!this.codes()[field]) return;
    this.codes.update((codes) => ({ ...codes, [field]: undefined }));
  }
}
