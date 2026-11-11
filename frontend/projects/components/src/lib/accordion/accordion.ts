import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Questions that open one by one:
 *
 *     <div jb-accordion>
 *       <details jb-accordion-item heading="How is a business verified?">…</details>
 *     </div>
 */
@Component({
  selector: 'div[jb-accordion]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'accordion' },
  templateUrl: './accordion.html',
  styleUrl: './accordion.scss',
})
export class Accordion {}
