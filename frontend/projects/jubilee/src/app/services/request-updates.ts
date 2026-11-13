import { computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, filter, interval, map, merge, pairwise, switchMap } from 'rxjs';
import { NavigationStore } from './navigation.store';
import { RealtimeService } from './realtime.service';

/** How often a member's request page asks while the event stream cannot connect (L2-070 AC6). */
export const REQUEST_POLL_MS = 5000;

/**
 * When a member's request page should read again, quietly (L2-070 AC6; ADR 0060): a request
 * notification it concerns arrives over the event stream; the stream connects again after being
 * down; the unread notification count falls, because an owner took back a confirmation and its
 * notification went with it; or, only while the stream cannot connect, every 5 seconds.
 * Call it in an injection context.
 */
export function requestUpdates(concerns: (target: string) => boolean): Observable<void> {
  const realtime = inject(RealtimeService);
  const navigation = inject(NavigationStore);
  const unread = computed(() => navigation.summary().unreadNotificationCount);

  const told = realtime.received.pipe(
    filter((item) => item.kind === 'request' && concerns(item.target)),
  );
  const connection = toObservable(realtime.connected);
  const back = connection.pipe(
    pairwise(),
    filter(([before, now]) => !before && now),
  );
  const fewer = toObservable(unread).pipe(
    pairwise(),
    filter(([before, now]) => now < before),
  );
  const fallback = connection.pipe(
    switchMap((connected) => (connected ? EMPTY : interval(REQUEST_POLL_MS))),
  );
  return merge(told, back, fewer, fallback).pipe(map(() => undefined));
}
