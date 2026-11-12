import { computed, signal } from '@angular/core';
import { SpaceDraft, SpaceTerm } from 'api';
import { SpaceCardView } from 'components';

/** A space's own fields that can be wrong (L2-199). */
export type SpaceField = 'rent' | 'available' | 'neighbourhood' | 'address' | 'household';

/** The server names a space's fields `space.rent` and so on (L2-199). */
export const SPACE_FIELDS: Readonly<Record<string, SpaceField>> = {
  'space.rent': 'rent',
  'space.available': 'available',
  'space.neighbourhood': 'neighbourhood',
  'space.address': 'address',
  'space.household': 'household',
};

/** The four terms as the form offers them (L2-199 AC1). */
export const TERM_CHOICES: readonly { value: SpaceTerm; label: string; text: string }[] = [
  {
    value: 'short-stay',
    label: 'Short stays',
    text: 'Nights or weekends: a guest suite, a hall by the hour.',
  },
  {
    value: 'long-term',
    label: 'Long term',
    text: 'A whole apartment, suite or house, by the month.',
  },
  { value: 'room', label: 'Rooms', text: 'A private room in a home you live in.' },
  { value: 'roommate', label: 'Roommates', text: 'Share a place you rent with someone new.' },
];

/** The minimum stays a term offers (L2-199 AC2): nights for a Short stay, months otherwise. */
const NIGHTS = [
  { value: '1', label: '1 night' },
  { value: '2', label: '2 nights' },
  { value: '3', label: '3 nights' },
  { value: '7', label: '1 week' },
];
const MONTHS = [
  { value: '1', label: 'Month to month' },
  { value: '4', label: '4 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '12-month lease' },
];

/** "The space" (L2-199 AC3). */
export const PLACES = [
  'Private room',
  'Basement apartment',
  'Guest suite',
  'Entire house',
  'Condo',
  'Event hall',
];

/** "What’s included" (L2-199 AC3). */
export const INCLUSIONS = [
  'Utilities',
  'Wi-Fi',
  'Laundry',
  'Furnished',
  'Parking',
  'Private bath',
  'Kitchen use',
  'Pets OK',
];

const MAX_RENT = 50_000;

/** What a space field says is wrong with it (L2-199 AC6). */
export function spaceMessage(field: SpaceField, code: string): string {
  switch (field) {
    case 'rent':
      return code === 'TOO_HIGH'
        ? 'Enter a rent of $50,000 or less.'
        : 'Enter the rent in whole dollars, like 950.';
    case 'available':
      return 'Say when renters can move in, like Mar 1 or Now.';
    case 'neighbourhood':
      return 'Enter the neighbourhood, like The Annex.';
    case 'address':
      return 'Enter the exact address. Renters only see it once you accept them.';
    case 'household':
      return 'Tell renters who lives there in a line or two.';
  }
}

/**
 * The space part of a listing form, shared by List a space (L2-198, L2-199) and the editor
 * (L2-209): its fields as the owner types them, the rules between them, the checks and what is sent.
 */
export class SpaceForm {
  readonly term = signal<SpaceTerm>('long-term');
  readonly rent = signal('');
  readonly available = signal('');
  readonly minimumStay = signal('1');
  readonly neighbourhood = signal('');
  readonly address = signal('');
  readonly place = signal(PLACES[0]);
  readonly facts = signal('');
  readonly included = signal<string[]>([]);
  readonly household = signal('');
  readonly rules = signal('');

  readonly nightly = computed(() => this.term() === 'short-stay');
  readonly minimumChoices = computed(() => (this.nightly() ? NIGHTS : MONTHS));
  /** A Room or a Roommate says who lives there (L2-199 AC4). */
  readonly householdLabel = computed(() =>
    this.term() === 'room'
      ? 'Who lives in the home'
      : this.term() === 'roommate'
        ? 'Who you are, and who you’re looking for'
        : null,
  );

  /** Fills the fields from what was stored. */
  apply(space: SpaceDraft): void {
    this.term.set(space.term);
    this.rent.set(space.rent ? String(space.rent) : '');
    this.available.set(space.available);
    this.minimumStay.set(String(space.minimumStay));
    this.neighbourhood.set(space.neighbourhood);
    this.address.set(space.address);
    this.place.set(space.place || PLACES[0]);
    this.facts.set(space.facts.join('\n'));
    this.included.set([...space.included]);
    this.household.set(space.household ?? '');
    this.rules.set(space.rules.join('\n'));
  }

  /**
   * A change of term keeps what was typed; only a minimum stay the new term lacks resets
   * (L2-199 AC5). Says whether the term changed.
   */
  setTerm(term: SpaceTerm): boolean {
    if (term === this.term()) return false;
    this.term.set(term);
    if (!this.minimumChoices().some((c) => c.value === this.minimumStay())) {
      this.minimumStay.set(this.minimumChoices()[0].value);
    }
    return true;
  }

  toggleIncluded(item: string): void {
    this.included.update((list) =>
      list.includes(item) ? list.filter((i) => i !== item) : [...list, item],
    );
  }

  /** The space as the API takes it. */
  body(): SpaceDraft {
    return {
      term: this.term(),
      rent: wholeDollars(this.rent()),
      available: this.available().trim(),
      minimumStay: Number(this.minimumStay()),
      neighbourhood: this.neighbourhood().trim(),
      address: this.address().trim(),
      place: this.place(),
      facts: lines(this.facts()),
      included: INCLUSIONS.filter((item) => this.included().includes(item)),
      household: this.householdLabel() ? this.household().trim() || null : null,
      rules: lines(this.rules()),
    };
  }

  /** What is wrong with the space fields, as the API's codes (L2-199 AC6). */
  check(): Partial<Record<SpaceField, string>> {
    const codes: Partial<Record<SpaceField, string>> = {};
    const rent = wholeDollars(this.rent());
    if (!rent) codes.rent = 'REQUIRED';
    else if (rent > MAX_RENT) codes.rent = 'TOO_HIGH';
    if (!this.available().trim()) codes.available = 'REQUIRED';
    if (!this.neighbourhood().trim()) codes.neighbourhood = 'REQUIRED';
    if (!this.address().trim()) codes.address = 'REQUIRED';
    if (this.householdLabel() && !this.household().trim()) codes.household = 'REQUIRED';
    return codes;
  }

  /** How renters will see the space while it is written (L2-198 AC3). */
  preview(name: string): SpaceCardView {
    return {
      name: name.trim() || 'Your listing title',
      term: this.term(),
      rent: wholeDollars(this.rent()) ?? 0,
      per: this.nightly() ? 'night' : 'month',
      facts: lines(this.facts()),
      neighbourhood: this.neighbourhood().trim() || 'Neighbourhood',
      available: this.available().trim(),
    };
  }
}

/** "1,850" or "$950" as whole dollars; null when there is no number. */
function wholeDollars(text: string): number | null {
  const digits = text.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : null;
}

/** One entry per line, without the empty ones (key facts, house rules). */
function lines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
