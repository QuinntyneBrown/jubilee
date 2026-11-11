import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The actions under the content of a `jb-card`, after a rule. They sit at the end; `start`
 * puts them at the start and lets them wrap.
 */
@Component({
  selector: 'div[jb-card-footer]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card__footer', '[class.card__footer--start]': 'start()' },
  templateUrl: './card-footer.html',
  styleUrl: './card-footer.scss',
})
export class CardFooter {
  readonly start = input(false, { transform: booleanAttribute });
}
