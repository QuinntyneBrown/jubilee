/**
 * What the two forms of a software platform share: List a software platform (L2-250) and the
 * editor of a live one (L2-256). The limits, the rule of the web address and the words of each
 * error are the same in both.
 */

export type PlatformField = 'website' | 'does' | 'for' | 'pricing';

/** The limits of a platform's fields (L2-250 AC2). */
export const WEBSITE_MAX = 200;
export const DOES_MAX = 600;
export const FOR_MAX = 300;
export const PRICING_MAX = 120;

/** The server's names of the platform fields, by the form's (L2-250 AC6). */
export const PLATFORM_FIELDS: Record<string, PlatformField> = {
  'platform.website': 'website',
  'platform.does': 'does',
  'platform.for': 'for',
  'platform.pricing': 'pricing',
};

/**
 * True for an absolute https address with a dotted host and no user or password, 200 characters
 * at most: the rule the API applies (L2-250 AC4). The address is only read as text.
 */
export function isWebAddress(value: string): boolean {
  const text = value.trim();
  if (!text || text.length > WEBSITE_MAX || /\s/.test(text)) return false;
  if (!/^https:\/\//i.test(text)) return false;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return false;
  }
  const host = url.hostname;
  return (
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    host.includes('.') &&
    !host.startsWith('.') &&
    !host.endsWith('.')
  );
}

/** The codes of what is wrong with a platform's fields, as the API would answer them. */
export function checkPlatform(
  values: Record<PlatformField, string>,
): Partial<Record<PlatformField, string>> {
  const codes: Partial<Record<PlatformField, string>> = {};
  const website = values.website.trim();
  if (!website) codes.website = 'REQUIRED';
  else if (!isWebAddress(website)) codes.website = 'INVALID';
  if (!values.does.trim()) codes.does = 'REQUIRED';
  if (!values.for.trim()) codes.for = 'REQUIRED';
  if (!values.pricing.trim()) codes.pricing = 'REQUIRED';
  return codes;
}

/** The words a platform field shows for a code (L2-250 AC3 to AC5). */
export function platformMessage(field: PlatformField, code: string): string {
  switch (field) {
    case 'website':
      return code === 'REQUIRED'
        ? 'Enter the web address where people use your platform.'
        : 'Enter a web address starting with https://';
    case 'does':
      return 'Say what your platform does in a few lines.';
    case 'for':
      return 'Say who your platform is for.';
    case 'pricing':
      return 'Say how it is priced, like “Free” or “$8 a month”.';
  }
}

/** The short line the summary links with, for a platform field. */
export function platformSummary(field: PlatformField, code: string): string {
  switch (field) {
    case 'website':
      return code === 'REQUIRED' ? 'Enter the web address' : platformMessage(field, code);
    case 'does':
      return 'Say what your platform does';
    case 'for':
      return 'Say who your platform is for';
    case 'pricing':
      return 'Say how it is priced';
  }
}
