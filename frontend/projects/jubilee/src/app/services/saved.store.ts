import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { SAVED_API, SavedItem, SavedList } from 'api';
import { ToastService } from 'components';

/** What a heart stands for: a business, or a product of a shop. */
export type SaveTarget =
  | { kind: 'business'; slug: string; name: string }
  | { kind: 'product'; shopSlug: string; slug: string; name: string };

const keyOf = (target: SaveTarget): string =>
  target.kind === 'business' ? `b:${target.slug}` : `p:${target.shopSlug}/${target.slug}`;

/**
 * The member's saved items (L2-041). A heart shows pressed at once and goes back when the server
 * refuses; the toasts say what happened and offer Undo or Try again.
 */
@Injectable({ providedIn: 'root' })
export class SavedStore {
  private readonly api = inject(SAVED_API);
  private readonly toasts = inject(ToastService);

  private readonly keys = signal<ReadonlySet<string>>(new Set());
  private loaded = false;
  /** Hearts pressed while the list was being read: the list read is older than they are. */
  private readonly sinceLoad = new Map<string, boolean>();
  private loading = false;
  /** Counts the resets, so a list read that was on its way before one is dropped. */
  private generation = 0;
  private readonly full = signal<SavedList | null>(null);
  /** Keys whose save or removal the server has not answered yet (L2-041 AC8). */
  private readonly busyKeys = signal<ReadonlySet<string>>(new Set());

  /** The list as last loaded, for the saved page. */
  readonly list = this.full.asReadonly();
  readonly count = computed(() => this.keys().size);

  /** Reads which items are saved; the hearts need it once per session. */
  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.loading = true;
    this.sinceLoad.clear();
    const generation = this.generation;
    this.api.list(true).subscribe({
      next: (list) => {
        if (generation !== this.generation) return;
        this.loading = false;
        this.adopt(list);
        // A save made while the list was on its way stays saved (L2-012 AC4).
        for (const [key, saved] of this.sinceLoad) this.set(key, saved);
      },
      error: () => {
        if (generation !== this.generation) return;
        this.loading = false;
        this.loaded = false;
      },
    });
  }

  /**
   * Forgets everything: the keys, the busy keys, the loaded list and a list read still on its way.
   * The application root calls it whenever no member is signed in (L2-041 AC10).
   */
  reset(): void {
    this.generation++;
    this.loaded = false;
    this.loading = false;
    this.sinceLoad.clear();
    this.keys.set(new Set());
    this.busyKeys.set(new Set());
    this.full.set(null);
  }

  adopt(list: SavedList): void {
    this.full.set(list);
    this.loaded = true;
    this.keys.set(new Set(list.items.filter((item) => item.available).map(keyFromItem)));
  }

  isSaved(target: SaveTarget): boolean {
    return this.keys().has(keyOf(target));
  }

  /** Whether the save or removal of the item is on its way (L2-041 AC8). */
  isBusy(target: SaveTarget): boolean {
    return this.busyKeys().has(keyOf(target));
  }

  /** The heart was pressed; a busy heart ignores it. */
  toggle(target: SaveTarget): void {
    if (this.isBusy(target)) return;
    if (this.isSaved(target)) this.remove(target);
    else this.save(target);
  }

  save(target: SaveTarget): void {
    const key = keyOf(target);
    const generation = this.generation;
    this.set(key, true);
    this.setBusy(key, true);
    const call =
      target.kind === 'business'
        ? this.api.saveBusiness(target.slug)
        : this.api.saveProduct(target.shopSlug, target.slug);
    call.subscribe({
      next: () => {
        if (generation !== this.generation) return;
        this.setBusy(key, false);
        this.full.set(null);
        this.toasts.show({
          tone: 'success',
          title: `Saved ${target.name}. Find it any time under Saved.`,
          action: { label: 'Undo', run: () => this.remove(target) },
        });
      },
      error: (error: HttpErrorResponse) => {
        if (generation !== this.generation) return;
        this.setBusy(key, false);
        this.set(key, false);
        if (error.status === 409 && error.error?.code === 'SAVED_LIMIT_REACHED') {
          this.toasts.show({
            tone: 'danger',
            title: 'You can save up to 500 items. Remove some to add more.',
          });
          return;
        }
        this.toasts.show({
          tone: 'danger',
          title: `Couldn\u2019t save ${target.name}. You\u2019re offline. Reconnect and tap the heart again.`,
          action: { label: 'Try again', run: () => this.save(target) },
        });
      },
    });
  }

  remove(target: SaveTarget): void {
    const key = keyOf(target);
    const generation = this.generation;
    this.set(key, false);
    this.setBusy(key, true);
    const call =
      target.kind === 'business'
        ? this.api.unsaveBusiness(target.slug)
        : this.api.unsaveProduct(target.shopSlug, target.slug);
    call.subscribe({
      next: () => {
        if (generation !== this.generation) return;
        this.setBusy(key, false);
        this.full.set(null);
      },
      error: () => {
        if (generation !== this.generation) return;
        this.setBusy(key, false);
        this.set(key, true);
        this.toasts.show({
          tone: 'danger',
          title: `Couldn\u2019t remove ${target.name} from Saved. Try again.`,
        });
      },
    });
  }

  /** "Remove" on the saved page, by the item's own id. */
  removeItem(item: SavedItem, done: () => void): void {
    this.api.remove(item.id).subscribe({
      next: () => {
        this.full.update((list) => {
          if (!list) return list;
          const items = list.items.filter((entry) => entry.id !== item.id);
          return {
            items,
            businessCount: items.filter((i) => i.available && i.kind === 'business').length,
            productCount: items.filter((i) => i.available && i.kind === 'product').length,
          };
        });
        this.keys.update((keys) => {
          const next = new Set(keys);
          next.delete(keyFromItem(item));
          return next;
        });
        done();
      },
      error: () =>
        this.toasts.show({
          tone: 'danger',
          title: `Couldn\u2019t remove ${item.name} from Saved. Try again.`,
        }),
    });
  }

  private setBusy(key: string, busy: boolean): void {
    this.busyKeys.update((keys) => {
      const next = new Set(keys);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  private set(key: string, saved: boolean): void {
    if (this.loading) this.sinceLoad.set(key, saved);
    this.keys.update((keys) => {
      const next = new Set(keys);
      if (saved) next.add(key);
      else next.delete(key);
      return next;
    });
  }
}

function keyFromItem(item: SavedItem): string {
  if (item.kind === 'business' && item.business) return `b:${item.business.slug}`;
  if (item.kind === 'product' && item.product) {
    return `p:${item.product.businessSlug}/${item.product.slug}`;
  }
  return `x:${item.id}`;
}
