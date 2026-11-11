import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * A count of unread items: `<span jb-unread-badge [count]="2"></span>`. It shows "99+" above
 * 99 and is announced as "{n} unread" (L2-065). Render it only when the count is above zero.
 */
@Component({
  selector: 'span[jb-unread-badge]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'badge badge--count', role: 'img', '[attr.aria-label]': 'label()' },
  templateUrl: './unread-badge.html',
})
export class UnreadBadge {
  readonly count = input.required<number>();
  /** What the count counts, in the spoken label: "unread" or "waiting". */
  readonly noun = input('unread');
  protected readonly text = computed(() => (this.count() > 99 ? '99+' : `${this.count()}`));
  protected readonly label = computed(() => `${this.count()} ${this.noun()}`);
}
