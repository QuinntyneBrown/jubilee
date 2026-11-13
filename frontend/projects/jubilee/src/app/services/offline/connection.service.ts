import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { timings } from './timings';

/** What the app knows about its connection to Jubilee (L2-121). */
export type ConnectionState = 'online' | 'offline' | 'unreachable' | 'slow';

/** Where "Check status" goes: the status page set for this build (ADR 0032, ADR 0068). */
export const STATUS_URL = environment.statusUrl;

/**
 * ConnectionService: the connection state machine behind the connection banner.
 *
 * - The browser's `offline` event makes the state `offline` at once (inside the 2 seconds of L2-121 AC1);
 *   `online` asks Jubilee whether it can be reached.
 * - A request that never got an answer while the network is up sends a probe to `/api/health/ping`.
 *   A probe that fails makes the state `unreachable` and tries again after 5, 10, 20, 40 and then
 *   60 seconds, publishing the seconds left (L2-121 AC2, AC3). A probe or request that works ends it.
 * - A mean latency above 3 seconds over the last 30 seconds makes the state `slow` (L2-121 AC4).
 */
@Injectable({ providedIn: 'root' })
export class ConnectionService {
  private readonly zone = inject(NgZone);
  private readonly now = () => performance.now();

  private readonly current = signal<ConnectionState>(
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online',
  );
  readonly state = this.current.asReadonly();
  /** True while the device has no network. Messages written now are queued and pages come from what was saved. */
  readonly isOffline = computed(() => this.current() === 'offline');
  /** True while a message cannot be delivered: no network, or Jubilee cannot be reached. */
  readonly cannotDeliver = computed(
    () => this.current() === 'offline' || this.current() === 'unreachable',
  );
  /** Seconds until the next attempt to reach Jubilee, or null when none is waiting. */
  readonly countdown = signal<number | null>(null);
  /** What the page adds to "You're offline." (the directory it is showing, for example). */
  readonly detail = signal<string | null>(null);
  /** How many saved messages were just sent after the connection came back; null when no notice is due. */
  readonly backOnline = signal<number | null>(null);
  /** Counts the times the connection came back, so pages and the queue can react once to each. */
  readonly returned = signal(0);

  private attempt = 0;
  private probing = false;
  private waitTimer?: ReturnType<typeof setTimeout>;
  private tickTimer?: ReturnType<typeof setInterval>;
  private readonly latencies: { at: number; ms: number }[] = [];

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('offline', () => this.zone.run(() => this.goOffline()));
    window.addEventListener('online', () => this.zone.run(() => void this.check()));
  }

  /** "Try again" and "Check status": ask Jubilee now. */
  async check(): Promise<void> {
    if (this.probing) return;
    this.probing = true;
    try {
      const reachable = await this.probe();
      if (reachable === 'reached') this.reached();
      else if (reachable === 'no-network') this.goOffline();
      else this.unreachable();
    } finally {
      this.probing = false;
    }
  }

  /** A request got no answer at all. */
  reportNetworkFailure(): void {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) this.goOffline();
    else if (this.current() !== 'unreachable') void this.check();
  }

  /** A request got an answer, so Jubilee can be reached. */
  reportSuccess(): void {
    if (this.current() === 'offline' || this.current() === 'unreachable') this.reached();
  }

  /** The time a finished request took, for the "slow" warning. */
  recordLatency(ms: number): void {
    const { latencyWindow, slowMean } = timings();
    const at = this.now();
    this.latencies.push({ at, ms });
    while (this.latencies.length > 0 && at - this.latencies[0].at > latencyWindow) {
      this.latencies.shift();
    }
    const mean = this.latencies.reduce((sum, item) => sum + item.ms, 0) / this.latencies.length;
    if (mean > slowMean && this.current() === 'online') this.current.set('slow');
    else if (mean <= slowMean && this.current() === 'slow') this.current.set('online');
  }

  /** After a drain that sent `count` saved messages. */
  announceSent(count: number): void {
    if (count > 0) this.backOnline.set(count);
  }

  dismissBackOnline(): void {
    this.backOnline.set(null);
  }

  private async probe(): Promise<'reached' | 'unreachable' | 'no-network'> {
    const { probeTimeout } = timings();
    try {
      const response = await fetch('/api/health/ping', {
        cache: 'no-store',
        signal: AbortSignal.timeout(probeTimeout),
      });
      return [502, 503, 504].includes(response.status) ? 'unreachable' : 'reached';
    } catch {
      return navigator.onLine === false ? 'no-network' : 'unreachable';
    }
  }

  private goOffline(): void {
    this.stopWaiting();
    this.latencies.length = 0;
    this.current.set('offline');
  }

  private unreachable(): void {
    this.current.set('unreachable');
    const { backoff } = timings();
    const wait = backoff[Math.min(this.attempt, backoff.length - 1)];
    this.attempt++;
    this.stopWaiting();
    let left = Math.ceil(wait / 1000);
    this.countdown.set(left);
    this.tickTimer = setInterval(() => {
      left = Math.max(0, left - 1);
      this.zone.run(() => this.countdown.set(left));
    }, 1000);
    this.waitTimer = setTimeout(() => {
      this.stopWaiting();
      this.zone.run(() => void this.check());
    }, wait);
  }

  private reached(): void {
    const was = this.current();
    this.stopWaiting();
    this.attempt = 0;
    this.current.set('online');
    if (was === 'offline' || was === 'unreachable') {
      this.backOnline.set(0);
      this.returned.update((n) => n + 1);
    }
  }

  private stopWaiting(): void {
    clearTimeout(this.waitTimer);
    clearInterval(this.tickTimer);
    this.countdown.set(null);
  }
}
