import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AwayPeriod, MY_BUSINESS_API } from 'api';
import { Alert, Button, DialogBody, DialogFooter, DialogFrame, Field, Input } from 'components';
import { ClockService } from 'api';
import { isoDay } from 'api';
import { FormDraftDirective } from '../../drafts/form-draft.directive';

export interface AwayPeriodData {
  /** The instant the owner is back, when an away period is set. */
  awayUntil: string | null;
}

type View = 'form' | 'busy' | 'failed';

const DAY_MS = 24 * 60 * 60 * 1000;

const MESSAGES: Record<string, string> = {
  REQUIRED: 'Choose a date from tomorrow on.',
  IN_PAST: 'Choose a date from tomorrow on.',
  TOO_FAR: 'Choose a date within a year.',
};

/**
 * AwayPeriodDialog (L2-062): the owner says the day they are back, or clears it. Members who
 * message the business are told while that day is ahead. The server checks the date again.
 */
@Component({
  selector: 'jb-away-period-dialog',
  imports: [
    FormDraftDirective,
    FormsModule,
    Button,
    Alert,
    Field,
    Input,
    DialogFrame,
    DialogBody,
    DialogFooter,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './away-period.dialog.html',
})
export class AwayPeriodDialog {
  private readonly ref = inject<DialogRef<AwayPeriod>>(DialogRef);
  private readonly api = inject(MY_BUSINESS_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly clock = inject(ClockService);
  protected readonly data = inject<AwayPeriodData>(DIALOG_DATA);

  private readonly today = isoDay(this.clock.now());
  /** The first and the last day that can be chosen: tomorrow, and a year from today. */
  protected readonly min = isoDay(new Date(this.clock.now().getTime() + DAY_MS));
  protected readonly max = `${Number(this.today.slice(0, 4)) + 1}${this.today.slice(4)}`;

  protected readonly view = signal<View>('form');
  protected readonly backOn = signal(
    this.data.awayUntil ? isoDay(new Date(this.data.awayUntil)) : '',
  );
  protected readonly problem = signal('');
  protected readonly busy = computed(() => this.view() === 'busy');

  protected save(): void {
    if (this.busy()) return;
    const day = this.backOn();
    const code = !day || day <= this.today ? 'IN_PAST' : day > this.max ? 'TOO_FAR' : '';
    if (code) {
      this.refuse(code);
      return;
    }
    this.send(day);
  }

  protected clear(): void {
    if (!this.busy()) this.send(null);
  }

  private send(until: string | null): void {
    this.problem.set('');
    this.view.set('busy');
    this.api.setAway(until).subscribe({
      next: (result) => this.ref.close(result),
      error: (error: unknown) => {
        const code =
          error instanceof HttpErrorResponse && error.status === 422
            ? (error.error as { errors?: Record<string, string> } | null)?.errors?.['until']
            : undefined;
        if (code) this.refuse(code);
        else this.view.set('failed');
      },
    });
  }

  private refuse(code: string): void {
    this.problem.set(MESSAGES[code] ?? 'Check this date.');
    this.view.set('form');
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('#d-back')?.focus());
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
