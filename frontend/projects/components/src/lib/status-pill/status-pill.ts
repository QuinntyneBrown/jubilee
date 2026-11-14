import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatusTone = 'good' | 'wait' | 'bad' | 'plain';

const GOOD =
  /^(active|published|approved|delivered|succeeded|paid|resolved|accepted|completed|fulfilled|verified|live|sent|confirmed|granted|signed|ready|in stock|done|read|passed|listed|fixed|within an hour)$/i;
const WAIT =
  /^(pending|draft|queued|in review|in progress|open|requested|new|scheduled|processing|retrying|invited|waitlisted|low stock|running|unread|submitted|awaiting|triaged|shipped|investigating|waiting|contacted|medium|unconfirmed|held|on hold|paused)$/i;
const BAD =
  /^(failed|rejected|suspended|banned|blocked|expired|revoked|declined|removed|cancelled|out of stock|dead|gave up|withdrawn|refunded|high|critical|locked|flagged|slow|deleted|taken down|dismissed)$/i;

/** The tone of a status word: good, waiting, bad or plain, as the Magic Patterns design colours it. */
export function toneOf(value: string | null | undefined): StatusTone {
  const word = value ?? '';
  if (GOOD.test(word)) return 'good';
  if (WAIT.test(word)) return 'wait';
  if (BAD.test(word)) return 'bad';
  return 'plain';
}

/**
 * A status as a pill (L2-277 AC4): `<span jb-status-pill value="active"></span>`. The word says the
 * status; the tone only colours it, so colour is never its only carrier.
 */
@Component({
  selector: 'span[jb-status-pill]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'status',
    '[class.status--good]': 'tone() === "good"',
    '[class.status--wait]': 'tone() === "wait"',
    '[class.status--bad]': 'tone() === "bad"',
  },
  templateUrl: './status-pill.html',
  styleUrl: './status-pill.scss',
})
export class StatusPill {
  readonly value = input.required<string>();
  protected readonly tone = computed(() => toneOf(this.value()));
}
