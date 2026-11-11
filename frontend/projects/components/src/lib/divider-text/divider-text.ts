import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A rule with a few words in its middle, between two ways of doing one thing:
 * `<p jb-divider-text>or use email</p>`.
 */
@Component({
  selector: 'p[jb-divider-text]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'divider-text' },
  templateUrl: './divider-text.html',
  styleUrl: './divider-text.scss',
})
export class DividerText {}
