import { inject, signal } from '@angular/core';
import { CheckInMoment, FEEDBACK_API, FeedbackApi, newKey } from 'api';

/**
 * The answer to the one question of a confirmation (L2-211). A score is stored the moment it is
 * chosen; every answer of the confirmation names the same check-in, so the last one replaces the
 * others. The question is a courtesy: when an answer cannot be stored nothing is said.
 */
export class MomentCheckIn {
  /** One check-in per confirmation. */
  private readonly id = newKey();
  readonly score = signal<number | null>(null);
  /** The answer is complete: a high score, or a low one whose note was sent. */
  readonly thanked = signal(false);

  constructor(
    private readonly api: FeedbackApi,
    private readonly moment: CheckInMoment,
  ) {}

  choose(score: number): void {
    this.score.set(score);
    this.thanked.set(score >= 4);
    this.store(score);
  }

  send(note: string): void {
    const score = this.score();
    if (score === null) return;
    this.thanked.set(true);
    this.store(score, note.trim());
  }

  private store(score: number, note = ''): void {
    this.api
      .saveCheckIn(this.id, { moment: this.moment, score, ...(note ? { note } : {}) })
      .subscribe({ error: () => undefined });
  }
}

/** The check-in of the confirmation a page or a dialog shows; call it where `inject` works. */
export function momentCheckIn(moment: CheckInMoment): MomentCheckIn {
  return new MomentCheckIn(inject(FEEDBACK_API), moment);
}
