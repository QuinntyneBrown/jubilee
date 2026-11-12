import { Dialog } from '@angular/cdk/dialog';
import { Injectable, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import {
  SignInRequiredData,
  SignInRequiredDialog,
} from '../dialogs/sign-in-required/sign-in-required.dialog';
import { PendingActionService } from './pending-action.service';
import { SaveTarget, SavedStore } from './saved.store';
import { SessionService } from './session.service';

/**
 * CardHearts (L2-041 AC7 to AC9, ADR 0054): the hearts of business, product and space cards. A
 * member's press saves or removes at once through `SavedStore`; a visitor's press is remembered
 * for the tab and asks them to join or sign in, and the save is carried out once they are back on
 * the same page.
 */
@Injectable({ providedIn: 'root' })
export class CardHearts {
  private readonly store = inject(SavedStore);
  private readonly session = inject(SessionService);
  private readonly pending = inject(PendingActionService);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);

  /**
   * Called once by a page with hearts on its cards, in its constructor: reads the saved list for a
   * member and finishes the save a visitor started on this page before signing in.
   */
  attach(): void {
    const url = toSignal(
      this.router.events.pipe(
        filter((event) => event instanceof NavigationEnd),
        map((): string | null => this.router.url),
      ),
      { initialValue: this.router.navigated ? this.router.url : null },
    );
    effect(() => {
      const member = this.session.member();
      const path = url();
      untracked(() => {
        if (!member) return;
        this.store.load();
        if (path === null) return;
        const target = this.pending.takeSave(path);
        if (target && !this.store.isSaved(target)) this.store.save(target);
      });
    });
  }

  /** The item of a business or space card: a space is saved as the listing it is. */
  business(card: { slug: string; name: string }): SaveTarget {
    return { kind: 'business', slug: card.slug, name: card.name };
  }

  /** The item of a product card. */
  product(shopSlug: string, card: { slug: string; name: string }): SaveTarget {
    return { kind: 'product', shopSlug, slug: card.slug, name: card.name };
  }

  isSaved(target: SaveTarget): boolean {
    return this.store.isSaved(target);
  }

  isBusy(target: SaveTarget): boolean {
    return this.store.isBusy(target);
  }

  /** The heart of a card was pressed. */
  press(target: SaveTarget, heart: HTMLElement): void {
    if (this.session.member()) {
      this.store.toggle(target);
      return;
    }
    const returnPath = this.router.url;
    this.pending.remember({ kind: 'save', returnPath, target });
    this.dialog.open<void, SignInRequiredData>(SignInRequiredDialog, {
      data: { title: `Join to save ${target.name}`, returnUrl: returnPath },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
      restoreFocus: heart,
    });
  }
}
