import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A short numbered sequence, side by side from the tablet layout:
 * `<ol jb-steps><li jb-step heading="Find someone you can trust">…</li></ol>`.
 */
@Component({
  selector: 'ol[jb-steps]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'steps' },
  templateUrl: './steps.html',
  styleUrl: './steps.scss',
})
export class Steps {}
