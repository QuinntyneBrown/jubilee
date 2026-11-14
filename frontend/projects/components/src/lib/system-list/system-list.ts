import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { Skeleton } from '../skeleton/skeleton';

/** An item of System (L2-275): its state, what it is about and when, opening its table. */
export interface SystemItem {
  /** `bad` is red and `wait` amber; the icon's name says the state too ("Failed", "Retrying"). */
  tone: 'bad' | 'wait' | 'plain';
  icon: IconName;
  state: string;
  /** The job or the topic, set as code before the text; none for maintenance. */
  subject: string | null;
  text: string;
  detail: string;
  link: string;
}

/**
 * System, beside the overview's work queue (L2-275 AC1–AC3): job runs that failed, outbox
 * messages retrying or given up, and maintenance under way, each opening its table. Colour is not
 * the only carrier of the state: the icon is an image named by it.
 *
 *     <ul jb-system-list [items]="items"></ul>
 */
@Component({
  selector: 'ul[jb-system-list]',
  imports: [RouterLink, Icon, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'system-list' },
  templateUrl: './system-list.html',
  styleUrl: './system-list.scss',
})
export class SystemList {
  readonly items = input<readonly SystemItem[]>([]);
  readonly loading = input(false, { transform: booleanAttribute });
  protected readonly skeletons = [0, 1, 2] as const;
}
