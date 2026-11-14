import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** The frame of the screens before sign-in (L2-189): the screen alone in `main`, with no shell. */
@Component({
  selector: 'jb-bare-page',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page' },
  templateUrl: './bare.page.html',
})
export class BarePage {}
