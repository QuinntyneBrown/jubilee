import { expect, test } from '../fixtures/jb-test';
import { LISTING_PHOTOS } from '../fixtures/photos';
import { BusinessPage } from '../pages/business.page';

// The photos of a listing on its public page (L2-221): a picture with srcset, sized for the screen.

const [cover, narrow, third] = LISTING_PHOTOS;
const renditions = (key: string, type: 'webp' | 'jpg', widths: number[]) =>
  widths
    .map((width, index) => `/media/${key}/${[320, 640, 1280][index]}.${type} ${width}w`)
    .join(', ');

test.describe('listing photos on the public page (L2-221)', () => {
  test('AC1: the cover photo stands in place of the tile, with its alt text, and the others follow under "Photos"', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business.photos');

    await expect(business.coverPhoto).toHaveAttribute('alt', cover.alt);
    await expect(business.mediaLabel).toHaveCount(0);
    await expect(business.photos.getByRole('heading', { level: 2 })).toHaveText('Photos');
    await expect(business.photoImages).toHaveCount(2);
    await expect(business.photoImages.nth(0)).toHaveAttribute('alt', narrow.alt);
    await expect(business.photoImages.nth(1)).toHaveAttribute('alt', third.alt);
    // The photo is really drawn: the browser chose a rendition and decoded it.
    await expect
      .poll(() => business.coverPhoto.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  });

  test('AC2: each photo is a picture with a WebP source and a JPEG fallback, a srcset at the true widths, sizes, width and height', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business.photos');

    await expect(business.coverWebp).toHaveAttribute(
      'srcset',
      renditions(cover.key, 'webp', [320, 640, 1200]),
    );
    await expect(business.coverWebp).toHaveAttribute('sizes', /\S/);
    await expect(business.coverPhoto).toHaveAttribute(
      'srcset',
      renditions(cover.key, 'jpg', [320, 640, 1200]),
    );
    await expect(business.coverPhoto).toHaveAttribute('src', `/media/${cover.key}/640.jpg`);
    await expect(business.coverPhoto).toHaveAttribute('sizes', /\S/);
    await expect(business.coverPhoto).toHaveAttribute('width', '1200');
    await expect(business.coverPhoto).toHaveAttribute('height', '896');
    // A photo 500 pixels wide has no rendition wider than itself: two entries, not three.
    await expect(business.photoWebpSources.nth(0)).toHaveAttribute(
      'srcset',
      renditions(narrow.key, 'webp', [320, 500]),
    );
    await expect(business.photoImages.nth(0)).toHaveAttribute('width', '500');
    await expect(business.photoImages.nth(0)).toHaveAttribute('height', '279');
  });

  test('AC3: the cover is fetched first and the photos under it load lazily', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business.photos');

    await expect(business.coverPhoto).toHaveAttribute('fetchpriority', 'high');
    await expect(business.coverPhoto).not.toHaveAttribute('loading', 'lazy');
    await expect(business.photoImages.nth(0)).toHaveAttribute('loading', 'lazy');
    await expect(business.photoImages.nth(1)).toHaveAttribute('loading', 'lazy');
    await expect(business.photoImages.nth(0)).not.toHaveAttribute('fetchpriority', 'high');
  });

  test('AC4: a listing with no photos shows the tile and no "Photos" section', async ({
    page,
    jb,
  }) => {
    const business = new BusinessPage(page);
    await jb.open('business');

    await expect(business.mediaLabel).toHaveText('Financial');
    await expect(business.coverPhoto).toHaveCount(0);
    await expect(business.photos).toHaveCount(0);
  });
});
