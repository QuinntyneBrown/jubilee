import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The pitch film's player: a still until play, then the film, with three chapters (L2-184). */
@Component({
  selector: 'jb-pitch-video',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pitch-video.html',
})
export class PitchVideo {}
