import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One step of `jb-steps`: its number, its heading and what it means. */
@Component({
  selector: 'li[jb-step]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'steps__step' },
  templateUrl: './step.html',
  styleUrl: './step.scss',
})
export class Step {
  readonly heading = input.required<string>();
}
