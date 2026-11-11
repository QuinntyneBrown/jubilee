import { Injectable, signal } from '@angular/core';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastSpec {
  tone: ToastTone;
  title: string;
  text?: string;
  action?: ToastAction;
  /** How long it stays; 0 keeps it until dismissed. */
  durationMs?: number;
}

export interface Toast extends ToastSpec {
  id: number;
  durationMs: number;
  paused: boolean;
}

interface Timer {
  handle: ReturnType<typeof setTimeout> | null;
  startedAt: number;
  remaining: number;
}

const DEFAULT_MS = 8000;

/** At most this many toasts show at once (L2-066 AC3). */
const MAX_SHOWN = 3;

/** Toasts: short, self-dismissing messages. The timer pauses on hover and focus. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly timers = new Map<number, Timer>();
  private readonly list = signal<Toast[]>([]);
  readonly toasts = this.list.asReadonly();

  show(spec: ToastSpec): number {
    const id = this.nextId++;
    // Info, success and warning go after 8 seconds; an error stays until it is dismissed (L2-066 AC1, AC2).
    const durationMs = spec.durationMs ?? (spec.tone === 'danger' ? 0 : DEFAULT_MS);
    this.list.update((all) => this.within([...all, { ...spec, id, durationMs, paused: false }]));
    if (durationMs > 0) this.start(id, durationMs);
    return id;
  }

  /** When there are too many, the oldest toast that is not an error goes; an error is never pushed out. */
  private within(all: Toast[]): Toast[] {
    const result = [...all];
    while (result.length > MAX_SHOWN) {
      const index = result.findIndex((toast) => toast.tone !== 'danger');
      if (index < 0 || index === result.length - 1) break;
      this.stop(result[index].id);
      this.timers.delete(result[index].id);
      result.splice(index, 1);
    }
    return result;
  }

  dismiss(id: number): void {
    this.stop(id);
    this.timers.delete(id);
    this.list.update((all) => all.filter((toast) => toast.id !== id));
  }

  /** Runs a toast's action, then removes the toast. */
  act(id: number): void {
    const toast = this.list().find((item) => item.id === id);
    this.dismiss(id);
    toast?.action?.run();
  }

  pause(id: number): void {
    const timer = this.timers.get(id);
    if (!timer || timer.handle === null) return;
    this.stop(id);
    timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt));
    this.mark(id, true);
  }

  resume(id: number): void {
    const timer = this.timers.get(id);
    if (!timer || timer.handle !== null) return;
    this.mark(id, false);
    this.start(id, timer.remaining);
  }

  private start(id: number, ms: number): void {
    const handle = setTimeout(() => this.dismiss(id), ms);
    this.timers.set(id, { handle, startedAt: Date.now(), remaining: ms });
  }

  private stop(id: number): void {
    const timer = this.timers.get(id);
    if (timer?.handle != null) clearTimeout(timer.handle);
    if (timer) timer.handle = null;
  }

  private mark(id: number, paused: boolean): void {
    this.list.update((all) => all.map((toast) => (toast.id === id ? { ...toast, paused } : toast)));
  }
}
