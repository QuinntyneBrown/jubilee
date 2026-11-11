import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
} from '@angular/core';

/** The two-letter avatar of a name: "Legacy Financial" is LF. */
export function initialsOf(name: string): string {
  const words = name.split(/[\s&]+/).filter((word) => /^[\p{L}\p{N}]/u.test(word));
  return (words[0]?.[0] ?? '?').concat(words[1]?.[0] ?? '').toUpperCase();
}

/**
 * The round mark that stands for a person or a business: their initials, or an icon.
 *
 *     <jb-avatar [name]="business.name" />
 *     <jb-avatar initials="JA" brand />
 *     <jb-avatar><svg jb-icon name="calendar"></svg></jb-avatar>
 *     <button jb-avatar size="sm" brand type="button" aria-haspopup="dialog">…</button>
 *
 * As `jb-avatar` it is decoration, hidden from assistive technology: the name stands beside
 * it. As a button it is a control and its content names it.
 */
@Component({
  selector: 'jb-avatar, button[jb-avatar]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'avatar',
    '[class.avatar--sm]': "size() === 'sm'",
    '[class.avatar--lg]': "size() === 'lg'",
    '[class.avatar--brand]': 'brand()',
    '[attr.aria-hidden]': "control ? null : 'true'",
  },
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
})
export class Avatar {
  /** The element, for a parent that anchors something to the avatar. */
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly control = this.element.tagName === 'BUTTON';

  /** The name the initials are taken from. */
  readonly name = input<string | null>(null);
  /** The initials, when the caller already has them. */
  readonly initials = input<string | null>(null);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** The member's own avatar, in the brand colour. */
  readonly brand = input(false, { transform: booleanAttribute });

  protected readonly text = computed(() => {
    const name = this.name();
    return this.initials() ?? (name === null ? '' : initialsOf(name));
  });
}
