import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A saved business or product with the button that removes it over its corner:
 *
 *     <li jb-saved-card>
 *       <a jb-business-card …></a>
 *       <button slot="remove" jb-button iconOnly size="sm" aria-label="Remove … from saved">…</button>
 *     </li>
 */
@Component({
  selector: 'li[jb-saved-card]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'saved-card' },
  templateUrl: './saved-card.html',
  styleUrl: './saved-card.scss',
})
export class SavedCard {}
