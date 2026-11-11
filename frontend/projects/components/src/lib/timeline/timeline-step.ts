import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Where a step stands: done, the one in hand, still to come, or where it all stopped. */
export type TimelineStepState = 'complete' | 'current' | 'upcoming' | 'stopped';

const MARK: Record<TimelineStepState, string> = {
  complete: '✓',
  current: '',
  upcoming: '',
  stopped: '×',
};

/**
 * One step of a `jb-timeline`: its dot, its heading and a line under it. The step in hand is
 * `aria-current="step"`; a done or a stopped step carries a mark in its dot as well as a colour.
 */
@Component({
  selector: 'li[jb-timeline-step]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'timeline__step',
    '[attr.data-complete]': 'state() === "complete" ? "" : null',
    '[attr.data-stopped]': 'state() === "stopped" ? "" : null',
    '[attr.aria-current]': 'state() === "current" ? "step" : null',
  },
  templateUrl: './timeline-step.html',
  styleUrl: './timeline-step.scss',
})
export class TimelineStep {
  readonly heading = input.required<string>();
  readonly text = input<string | null | undefined>(null);
  readonly state = input<TimelineStepState>('upcoming');

  protected readonly mark = computed(() => MARK[this.state()]);
}
