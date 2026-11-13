import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import { Icon } from '../icon/icon';
import { Stars } from '../stars/stars';

/**
 * The posted state of the Write a review screen (L2-228 AC4): a round check, "Thanks, your review
 * is live.", what happens next, the review in short and the ways on, projected as
 * `[slot=actions]`. The heading takes focus when it appears.
 *
 *     <div jb-review-posted name="Legacy Financial" [rating]="5" word="Excellent"
 *          itemName="Discovery meeting" [text]="text">
 *       <a slot="actions" jb-button variant="primary" routerLink="/b/legacy-financial">See it on their page</a>
 *     </div>
 */
@Component({
  selector: 'div[jb-review-posted]',
  imports: [Icon, Stars],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'review-posted' },
  templateUrl: './review-posted.html',
  styleUrl: './review-posted.scss',
})
export class ReviewPosted {
  readonly name = input.required<string>();
  readonly rating = input.required<number>();
  readonly word = input.required<string>();
  readonly itemName = input.required<string>();
  readonly text = input.required<string>();

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => host.querySelector<HTMLElement>('.review-posted__title')?.focus());
  }
}
