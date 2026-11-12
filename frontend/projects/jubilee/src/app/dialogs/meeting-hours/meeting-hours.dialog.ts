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
import { CATALOGUE_API, MeetingHours, slotLabel } from 'api';
import {
  Alert,
  Button,
  Checkbox,
  DialogBody,
  DialogFooter,
  DialogFrame,
  Field,
  Input,
  Select,
} from 'components';
import { FormDraftDirective } from '../../drafts/form-draft.directive';

export interface MeetingHoursData {
  /** The hours in force, or the ones proposed to an owner who never saved any. */
  hours: MeetingHours;
}

type View = 'form' | 'busy' | 'failed';

interface Problems {
  days?: string;
  opensAt?: string;
  closesAt?: string;
  slotMinutes?: string;
}

/** The days in the order of a week that starts on Monday; the value is the day of the week, 0 for Sunday. */
const WEEK = [
  { value: 1, name: 'Monday' },
  { value: 2, name: 'Tuesday' },
  { value: 3, name: 'Wednesday' },
  { value: 4, name: 'Thursday' },
  { value: 5, name: 'Friday' },
  { value: 6, name: 'Saturday' },
  { value: 0, name: 'Sunday' },
];

/** The slot lengths an owner chooses from, as the API accepts them. */
const LENGTHS = [
  { minutes: 15, label: '15 minutes' },
  { minutes: 30, label: '30 minutes' },
  { minutes: 45, label: '45 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 90, label: '1½ hours' },
  { minutes: 120, label: '2 hours' },
];

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

/**
 * MeetingHoursDialog (L2-220): the owner says on which days, between which Toronto times and how
 * often a meeting time is offered. Members are then offered only those times; requests already
 * sent keep theirs. The server checks the hours again.
 */
@Component({
  selector: 'jb-meeting-hours-dialog',
  imports: [
    FormDraftDirective,
    FormsModule,
    Alert,
    Button,
    Checkbox,
    DialogBody,
    DialogFooter,
    DialogFrame,
    Field,
    Input,
    Select,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meeting-hours.dialog.html',
})
export class MeetingHoursDialog {
  private readonly ref = inject<DialogRef<MeetingHours>>(DialogRef);
  private readonly api = inject(CATALOGUE_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<MeetingHoursData>(DIALOG_DATA);

  protected readonly week = WEEK;
  protected readonly lengths = LENGTHS;

  protected readonly view = signal<View>('form');
  protected readonly days = signal<number[]>([...this.data.hours.days]);
  protected readonly opensAt = signal(this.data.hours.opensAt);
  protected readonly closesAt = signal(this.data.hours.closesAt);
  protected readonly slotMinutes = signal(this.data.hours.slotMinutes);
  protected readonly problems = signal<Problems>({});
  protected readonly busy = computed(() => this.view() === 'busy');

  protected toggle(day: number, ticked: boolean): void {
    this.days.update((days) => (ticked ? [...days, day] : days.filter((other) => other !== day)));
  }

  protected save(): void {
    if (this.busy()) return;
    const problems = this.check();
    if (Object.keys(problems).length > 0) {
      this.refuse(problems);
      return;
    }
    this.problems.set({});
    this.view.set('busy');
    this.api
      .setMeetingHours({
        days: [...this.days()].sort((a, b) => a - b),
        opensAt: this.opensAt(),
        closesAt: this.closesAt(),
        slotMinutes: this.slotMinutes(),
      })
      .subscribe({
        next: (hours) => this.ref.close(hours),
        error: (error: unknown) => {
          const codes =
            error instanceof HttpErrorResponse && error.status === 422
              ? (error.error as { errors?: Record<string, string> } | null)?.errors
              : undefined;
          if (codes && Object.keys(codes).length > 0) this.refuse(this.worded(codes));
          else this.view.set('failed');
        },
      });
  }

  /** The checks the server makes again, for feedback before anything is sent (L2-220 AC2). */
  private check(): Problems {
    const codes: Record<string, string> = {};
    if (this.days().length === 0) codes['days'] = 'REQUIRED';
    const opens = TIME.test(this.opensAt());
    const closes = TIME.test(this.closesAt());
    if (!opens) codes['opensAt'] = 'REQUIRED';
    if (!closes) codes['closesAt'] = 'REQUIRED';
    if (opens && closes) {
      const room = minutesOf(this.closesAt()) - minutesOf(this.opensAt());
      if (room <= 0) codes['closesAt'] = 'BEFORE_OPENS';
      else if (room < this.slotMinutes()) codes['slotMinutes'] = 'TOO_SHORT';
    }
    return this.worded(codes);
  }

  private worded(codes: Record<string, string>): Problems {
    const time = (code: string | undefined) =>
      code === 'BEFORE_OPENS'
        ? `Choose a time after ${TIME.test(this.opensAt()) ? slotLabel(this.opensAt()) : 'the opening time.'}`
        : code
          ? 'Choose a time.'
          : undefined;
    const length = LENGTHS.find((option) => option.minutes === this.slotMinutes())?.label;
    const problems: Problems = {};
    if (codes['days']) problems.days = 'Choose at least one day.';
    if (codes['opensAt']) problems.opensAt = time(codes['opensAt']);
    if (codes['closesAt']) problems.closesAt = time(codes['closesAt']);
    if (codes['slotMinutes']) {
      problems.slotMinutes =
        codes['slotMinutes'] === 'TOO_SHORT'
          ? `Leave room for at least one meeting: ${length} or more.`
          : 'Choose how often a time is offered.';
    }
    return problems;
  }

  /** Shows the problems and moves focus to the first field that has one. */
  private refuse(problems: Problems): void {
    this.problems.set(problems);
    this.view.set('form');
    const first = problems.days
      ? '#d-day-1'
      : problems.opensAt
        ? '#d-from'
        : problems.closesAt
          ? '#d-until'
          : '#d-every';
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>(first)?.focus());
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
