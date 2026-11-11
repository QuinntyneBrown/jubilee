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
import { ADMIN_API, ReportActionKind, ReportDetail } from 'api';
import { Icon } from 'components';

export interface ReportActionData {
  reportId: string;
  kind: ReportActionKind;
  listingName: string;
}

type View = 'form' | 'busy' | 'failed';

interface Wording {
  title: string;
  text: string;
  cta: string;
  danger: boolean;
  messages: boolean;
}

/** The dialog that collects the required resolution note (and the message text) for a report action (L2-105 AC2). */
@Component({
  selector: 'jb-report-action-dialog',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog' },
  templateUrl: './report-action.dialog.html',
})
export class ReportActionDialog {
  private readonly ref = inject<DialogRef<ReportDetail>>(DialogRef);
  private readonly api = inject(ADMIN_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<ReportActionData>(DIALOG_DATA);

  protected readonly view = signal<View>('form');
  protected readonly note = signal('');
  protected readonly text = signal('');
  protected readonly noteProblem = signal(false);
  protected readonly textProblem = signal(false);
  protected readonly busy = computed(() => this.view() === 'busy');

  protected readonly wording = computed<Wording>(() => {
    const name = this.data.listingName;
    switch (this.data.kind) {
      case 'dismiss':
        return {
          title: 'Dismiss this report?',
          text: 'The report is resolved and nothing changes for the business.',
          cta: 'Dismiss report',
          danger: false,
          messages: false,
        };
      case 'message-reporter':
        return {
          title: 'Message the reporter',
          text: 'Sent to the member who reported, in the name of the Jubilee verification team. The report stays in review.',
          cta: 'Send message',
          danger: false,
          messages: true,
        };
      case 'message-owner':
        return {
          title: 'Message the owner',
          text: 'Sent in the name of the Jubilee verification team. The owner is never told who reported the listing.',
          cta: 'Send message',
          danger: false,
          messages: true,
        };
      case 'hold':
        return {
          title: `Place ${name} on hold?`,
          text: 'The listing leaves public pages while you look into the report. The owner is told “We’ve paused your listing while we look into a report” and never who reported it.',
          cta: 'Place on hold',
          danger: false,
          messages: false,
        };
      case 'remove':
        return {
          title: `Remove ${name}?`,
          text: 'The listing leaves every public page and the report is resolved. The owner is told it was removed.',
          cta: 'Remove listing',
          danger: true,
          messages: false,
        };
      default:
        return {
          title: `Lift the hold on ${name}?`,
          text: 'The listing is public again and the report is resolved.',
          cta: 'Lift hold',
          danger: false,
          messages: false,
        };
    }
  });

  protected send(): void {
    if (this.busy()) return;
    const note = this.note().trim();
    const text = this.text().trim();
    this.noteProblem.set(!note);
    this.textProblem.set(this.wording().messages && !text);
    if (!note || (this.wording().messages && !text)) {
      const field = this.wording().messages && !text ? '#r-text' : '#r-note';
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>(field)?.focus());
      return;
    }
    this.view.set('busy');
    this.api
      .applyReportAction(
        this.data.reportId,
        this.data.kind,
        note,
        this.wording().messages ? text : null,
      )
      .subscribe({
        next: (detail) => this.ref.close(detail),
        error: (error: unknown) => {
          // A refused field keeps the dialog open on the form with the problem named.
          if (error instanceof HttpErrorResponse && error.status === 422) {
            const errors =
              (error.error as { errors?: Record<string, string> } | null)?.errors ?? {};
            this.noteProblem.set(!!errors['resolutionNote']);
            this.textProblem.set(!!errors['messageText']);
            this.view.set('form');
            return;
          }
          this.view.set('failed');
        },
      });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
