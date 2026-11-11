import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The title of a `jb-card` that places it itself, beside a status or an action. */
@Component({
  selector: 'h2[jb-card-title]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card__title' },
  templateUrl: './card-title.html',
  styleUrl: './card-title.scss',
})
export class CardTitle {}
