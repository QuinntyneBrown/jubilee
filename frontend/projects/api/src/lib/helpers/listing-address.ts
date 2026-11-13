/** The link people share for a listing, and the same link as the text a screen shows (L2-244). */
export interface ListingLink {
  /** `https://luzandre-com.jubilee.to`, or `{origin}/b/{slug}` where no address domain is set. */
  url: string;
  /** The link without its scheme: `luzandre-com.jubilee.to`. */
  text: string;
}

/**
 * The link to share for a listing (L2-244, ADR 0067): its address, `https://{slug}.jubilee.to`,
 * where the API states one; otherwise the listing's page on the app's own host, as in local
 * development and the end-to-end suite (L2-244 AC6).
 */
export function listingAddress(
  address: string | null | undefined,
  slug: string,
  origin: string,
): ListingLink {
  const url = address || `${origin}/b/${slug}`;
  return { url, text: url.replace(/^https?:\/\//, '') };
}
