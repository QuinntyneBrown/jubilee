import { ChangeDetectionStrategy, Component } from '@angular/core';

/** "Shops and services, side by side.": five business cards (L2-183 AC5). */
@Component({
  selector: 'jb-inside-the-app',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inside-the-app.html',
})
export class InsideTheApp {}
