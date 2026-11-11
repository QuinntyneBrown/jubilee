import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
} from '@angular/core';

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * The button, on the native element so that a link stays a link and a button a button:
 *
 *     <button jb-button variant="primary" type="submit" [busy]="saving()">Save</button>
 *     <a jb-button size="sm" routerLink="/requests">View requests</a>
 *     <button jb-button variant="ghost" iconOnly type="button" aria-label="Close">
 *       <svg jb-icon name="close"></svg>
 *     </button>
 *
 * `busy` replaces the label with a spinner and sets `aria-busy`; the element keeps its size and
 * its name. An `iconOnly` button has no text, so it needs `aria-label`.
 *
 * A band of the brand colour re-skins the ghost variant through `--jb-btn-ghost-fg`,
 * `--jb-btn-ghost-border`, `--jb-btn-ghost-bg-hover` and `--jb-btn-ghost-bg-active`; a container
 * whose small buttons are primary touch controls raises them with `--jb-btn-sm-min-height`; a
 * block that sets its actions in its own text style (an alert) passes `--jb-btn-fg` and
 * `--jb-btn-font-weight`.
 */
@Component({
  selector: 'button[jb-button], a[jb-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'btn',
    '[class.btn--primary]': 'variant() === "primary"',
    '[class.btn--ghost]': 'variant() === "ghost"',
    '[class.btn--danger]': 'variant() === "danger"',
    '[class.btn--link]': 'variant() === "link"',
    '[class.btn--sm]': 'size() === "sm"',
    '[class.btn--lg]': 'size() === "lg"',
    '[class.btn--icon]': 'iconOnly()',
    '[class.btn--block]': 'block()',
    '[attr.aria-busy]': 'busy() ? "true" : null',
  },
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('md');
  /** A square button that holds one icon and no text. */
  readonly iconOnly = input(false, { transform: booleanAttribute });
  /** Fills the width of its container. */
  readonly block = input(false, { transform: booleanAttribute });
  /** True while the action the button started is running. */
  readonly busy = input(false, { transform: booleanAttribute });

  /** The native element, for a caller that returns focus to the button or anchors a dialog on it. */
  readonly element =
    inject<ElementRef<HTMLButtonElement | HTMLAnchorElement>>(ElementRef).nativeElement;
}
