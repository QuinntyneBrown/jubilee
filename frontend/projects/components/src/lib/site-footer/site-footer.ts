import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** The footer of every app page (L2-112): the copyright line and the four trust links. */
@Component({
  selector: 'footer[jb-site-footer]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'footer' },
  templateUrl: './site-footer.html',
})
export class SiteFooter {
  readonly year = input.required<number>();
}
