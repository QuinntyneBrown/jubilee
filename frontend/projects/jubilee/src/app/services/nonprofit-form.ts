import { WEBSITE_MAX, isWebAddress } from './platform-form';

/**
 * What the two forms of a non-profit share: List a non-profit (L2-287) and the editor of a live
 * one (L2-294). The limits, the rule of the two addresses and the words of each error are the
 * same in both; the addresses follow the rule of a platform's (L2-250 AC4, ADR 0074).
 */

export type NonprofitField = 'website' | 'giveUrl' | 'mission' | 'serves' | 'area';

/** The limits of a non-profit's fields (L2-287 AC2). */
export const GIVE_MAX = WEBSITE_MAX;
export const MISSION_MAX = 600;
export const SERVES_MAX = 300;
export const AREA_MAX = 120;

/** The server's names of the non-profit fields, by the form's (L2-287 AC7). */
export const NONPROFIT_FIELDS: Record<string, NonprofitField> = {
  'nonprofit.website': 'website',
  'nonprofit.giveUrl': 'giveUrl',
  'nonprofit.mission': 'mission',
  'nonprofit.serves': 'serves',
  'nonprofit.area': 'area',
};

/** The codes of what is wrong with a non-profit's fields, as the API would answer them. */
export function checkNonprofit(
  values: Record<NonprofitField, string>,
): Partial<Record<NonprofitField, string>> {
  const codes: Partial<Record<NonprofitField, string>> = {};
  const website = values.website.trim();
  if (!website) codes.website = 'REQUIRED';
  else if (!isWebAddress(website)) codes.website = 'INVALID';
  // The page for giving is optional (L2-287 AC5).
  const give = values.giveUrl.trim();
  if (give && !isWebAddress(give)) codes.giveUrl = 'INVALID';
  if (!values.mission.trim()) codes.mission = 'REQUIRED';
  if (!values.serves.trim()) codes.serves = 'REQUIRED';
  if (!values.area.trim()) codes.area = 'REQUIRED';
  return codes;
}

/** The words a non-profit field shows for a code (L2-287 AC3, AC4, AC6). */
export function nonprofitMessage(field: NonprofitField, code: string): string {
  switch (field) {
    case 'website':
      return code === 'REQUIRED'
        ? 'Enter the non-profit’s website.'
        : 'Enter a web address starting with https://';
    case 'giveUrl':
      return 'Enter a web address starting with https://';
    case 'mission':
      return 'Say what work it does, in its own words.';
    case 'serves':
      return 'Say who it serves.';
    case 'area':
      return 'Say where in Toronto it works.';
  }
}

/** The short line the summary links with, for a non-profit field (L2-287 AC6). */
export function nonprofitSummary(field: NonprofitField, code: string): string {
  switch (field) {
    case 'website':
      return code === 'REQUIRED' ? 'Enter its website' : nonprofitMessage(field, code);
    case 'giveUrl':
      return 'Check the page for giving';
    case 'mission':
      return 'Say what work it does';
    case 'serves':
      return 'Say who it serves';
    case 'area':
      return 'Say where in Toronto it works';
  }
}

/** The name and the line, asked for in the words of a non-profit (L2-287 AC6). */
export const NONPROFIT_NAME_MESSAGE = 'Enter the name people know it by.';
export const NONPROFIT_NAME_SUMMARY = 'Enter the non-profit’s name';
export const NONPROFIT_TAGLINE_MESSAGE = 'Say in one line what it does.';
