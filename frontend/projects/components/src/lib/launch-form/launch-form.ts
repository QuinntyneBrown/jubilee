import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The panel of a form of the launching-soon marketing page (L2-216, L2-217):
 *
 *     <form jb-launch-form tone="paper" aria-label="Launch notification" (submit)="send($event)">
 *       <div slot="notice" jb-alert tone="danger" role="alert">…</div>
 *       <div jb-field …>…</div>
 *       <button slot="actions" jb-marketing-button type="submit">Tell me when it launches</button>
 *       <span slot="note">We use your address for the launch notice only.</span>
 *     </form>
 *
 * `[slot=notice]` is what stands above the fields (an alert or a `jb-form-summary`), the fields
 * are projected as they are, `[slot=actions]` holds the button and `[slot=note]` the small print.
 * `paper` is the cream panel, for a form on the white section. It reads the marketing page's
 * grounds: --jb-mkt-paper.
 */
@Component({
  selector: 'form[jb-launch-form]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-form', '[class.mkt-form--paper]': 'tone() === "paper"' },
  templateUrl: './launch-form.html',
  styleUrl: './launch-form.scss',
})
export class LaunchForm {
  readonly tone = input<'surface' | 'paper'>('surface');
}
