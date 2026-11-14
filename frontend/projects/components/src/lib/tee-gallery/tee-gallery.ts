import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Tee } from '../tee/tee';

export type TeeView = 'front' | 'back';

/**
 * The shirt on its stage, with "Front" and "Back" under it as toggle buttons (L2-264 AC1):
 *
 *     <section jb-tee-gallery [view]="view()" (viewChange)="view.set($event)"></section>
 */
@Component({
  selector: 'section[jb-tee-gallery]',
  imports: [Tee],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tee-gallery', 'aria-label': 'Pictures of the tee' },
  templateUrl: './tee-gallery.html',
  styleUrl: './tee-gallery.scss',
})
export class TeeGallery {
  readonly view = input<TeeView>('front');
  readonly viewChange = output<TeeView>();

  protected readonly views: readonly TeeView[] = ['front', 'back'];
  protected readonly labels: Record<TeeView, string> = {
    front:
      'The Purpose Tee from the front: “Prosper with purpose.” across the chest, “purpose.” in gold',
    back: 'The Purpose Tee from the back: the J mark and jubilee.to below the collar',
  };
}
