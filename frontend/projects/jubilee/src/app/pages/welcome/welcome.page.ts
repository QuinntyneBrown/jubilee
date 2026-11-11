import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORIES, DIRECTORY_API, Welcome } from 'api';
import { BusinessCard, CountPipe, Icon, Button, Chip, ChipRow, Section } from 'components';

/**
 * The public landing page for visitors (L2-020). Its text does not wait for data: the live
 * count and "Featured this week" appear when `GET /api/directory/welcome` answers, and the
 * page stays as it is when that request fails.
 */
@Component({
  selector: 'jb-welcome-page',
  imports: [RouterLink, BusinessCard, CountPipe, Icon, Button, Chip, ChipRow, Section],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page' },
  templateUrl: './welcome.page.html',
})
export class WelcomePage {
  protected readonly categories = CATEGORIES;
  protected readonly welcome = signal<Welcome | null>(null);

  constructor() {
    inject(DIRECTORY_API)
      .getWelcome()
      .subscribe({ next: (welcome) => this.welcome.set(welcome), error: () => undefined });
  }
}
