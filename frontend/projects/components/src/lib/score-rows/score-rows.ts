import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The parts of something, each with its score scale:
 *
 *     <ul jb-score-rows>
 *       <li jb-score-row heading="Finding businesses" detail="Browse, search and categories">
 *         <fieldset jb-score-scale legend="Finding businesses, from 1 to 5" …></fieldset>
 *       </li>
 *     </ul>
 */
@Component({
  selector: 'ul[jb-score-rows]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'score-rows' },
  templateUrl: './score-rows.html',
  styleUrl: './score-rows.scss',
})
export class ScoreRows {}
