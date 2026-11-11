import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';

/** A named time in a film that the visitor can jump to. */
export interface VideoChapter {
  /** Seconds into the film. */
  at: number;
  /** The time as it is shown, for example "0:21". */
  time: string;
  title: string;
}

/**
 * A film behind a still: the still with a play button until the visitor presses play or chooses
 * a chapter, then the film with the browser's controls. The film is not fetched before that.
 *
 *     <jb-video-player src="media/film.mp4" still="photos/still.jpg" label="Jubilee pitch film"
 *                      playLabel="Play the Jubilee film" length="1:04" [chapters]="chapters" />
 *
 * The chapter that was chosen is `aria-current` while the film plays. A film shown here needs
 * its narration in the picture or a caption track of its own; the player adds none.
 */
@Component({
  selector: 'jb-video-player',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mkt-player' },
  templateUrl: './video-player.html',
  styleUrl: './video-player.scss',
})
export class VideoPlayer {
  readonly src = input.required<string>();
  readonly still = input.required<string>();
  /** The name of the film, for assistive technology. */
  readonly label = input.required<string>();
  /** The name of the play button, for example "Play the Jubilee film". */
  readonly playLabel = input.required<string>();
  /** How long the film is, as it is shown on the still. */
  readonly length = input.required<string>();
  readonly chapters = input<readonly VideoChapter[]>([]);

  protected readonly playing = signal(false);
  protected readonly current = signal(0);
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  /** Plays the film from a chapter; the play button starts at the beginning. */
  protected play(index: number | null = null): void {
    this.current.set(index ?? 0);
    this.playing.set(true);
    const video = this.video().nativeElement;
    video.currentTime = index === null ? 0 : this.chapters()[index].at;
    // A browser may refuse to play; the controls are there for the visitor to press.
    video.play().catch(() => undefined);
    video.focus({ preventScroll: true });
  }
}
