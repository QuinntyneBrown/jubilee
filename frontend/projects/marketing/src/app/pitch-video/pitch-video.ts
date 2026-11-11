import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChild } from '@angular/core';
import { FILM_STILL } from '../content';

/** A named time in the film that the visitor can jump to. */
interface Chapter {
  /** Seconds into the film. */
  at: number;
  time: string;
  title: string;
}

/**
 * The pitch film's player (L2-184): a still with a play button until the visitor presses play
 * or chooses a chapter, then the film with the browser's controls. The film is not fetched
 * before that. Its captions are part of the picture, so there is no caption track.
 */
@Component({
  selector: 'jb-pitch-video',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pitch-video.html',
})
export class PitchVideo {
  protected readonly still = FILM_STILL;
  protected readonly film = 'media/jubilee-pitch.mp4';
  protected readonly length = '1:04';
  /** The acts of the film: the hook, why join and what you can do, then listing a business. */
  protected readonly chapters: readonly Chapter[] = [
    { at: 0, time: '0:00', title: 'Why we built Jubilee' },
    { at: 21.6, time: '0:21', title: 'Finding someone you can trust' },
    { at: 43.2, time: '0:43', title: 'Growing your business' },
  ];

  protected readonly playing = signal(false);
  protected readonly current = signal(0);
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  /** Plays the film from a chapter; the play button starts at the first one. */
  protected play(index = 0): void {
    this.current.set(index);
    this.playing.set(true);
    const video = this.video().nativeElement;
    video.currentTime = this.chapters[index].at;
    // A browser may refuse to play; the controls are there for the visitor to press.
    video.play().catch(() => undefined);
    video.focus({ preventScroll: true });
  }
}
