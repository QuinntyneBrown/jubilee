import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Lockup } from '../lockup/lockup';

/**
 * The frame of a page on the bare shell: the lockup, a card that holds what the page projects,
 * and a line under the card.
 *
 *     <jb-auth-layout heading="Reset your password">
 *       <form class="stack">…</form>
 *       <span slot="foot">Remembered it? <a routerLink="/sign-in">Back to sign in</a></span>
 *     </jb-auth-layout>
 *
 * `split` is the frame of Log in and Sign up (ADR 0038): under 1024 px a larger lockup above a
 * rounder card, from 1024 px a brand panel beside the form, which then has no card around it.
 *
 * `heading` is the `h1` of the screen and `lead` the line under it. A page that projects its
 * title instead (its own `h1`, or a `jb-empty-state` at level 1) passes none; that title is set
 * at the size of the frame through `--jb-h1-size` and `--jb-empty-title-size`. `slot="note"` is
 * a last line inside the card, `slot="foot"` the line under it; each takes one element.
 */
@Component({
  selector: 'jb-auth-layout',
  imports: [RouterLink, Lockup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'auth-layout', '[class.auth-layout--split]': 'split()' },
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {
  readonly heading = input<string | null>(null);
  readonly lead = input<string | null>(null);
  /** The frame of Log in and Sign up, with the brand panel from 1024 px. */
  readonly split = input(false, { transform: booleanAttribute });
}
