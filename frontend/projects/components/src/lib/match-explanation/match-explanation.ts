import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** What the explanation shows: text and the spans to highlight, never markup. */
export interface MatchExplanationView {
  text: string;
  highlights: readonly { start: number; length: number }[];
}

interface Segment {
  text: string;
  marked: boolean;
}

/**
 * The sentence under a search result, "Matches plumbing in name and 4 services", with the matched
 * term in `<mark>`. The text goes through text binding only, so markup in a result is shown as
 * text and never run (L2-032 AC3).
 */
@Component({
  selector: 'span[jb-match-explanation]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './match-explanation.html',
})
export class MatchExplanation {
  readonly explanation = input.required<MatchExplanationView>();

  protected readonly segments = computed<Segment[]>(() => {
    const { text, highlights } = this.explanation();
    const segments: Segment[] = [];
    let at = 0;
    for (const range of [...highlights].sort((a, b) => a.start - b.start)) {
      if (range.start < at || range.start + range.length > text.length) continue;
      if (range.start > at) segments.push({ text: text.slice(at, range.start), marked: false });
      segments.push({ text: text.slice(range.start, range.start + range.length), marked: true });
      at = range.start + range.length;
    }
    if (at < text.length) segments.push({ text: text.slice(at), marked: false });
    return segments;
  });
}
