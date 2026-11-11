import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** StatementOfFaithPage (L2-075): what a listing owner agrees to, and how a listing is confirmed. */
@Component({
  selector: 'jb-statement-of-faith-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'container page' },
  templateUrl: './statement-of-faith.page.html',
})
export class StatementOfFaithPage {}
