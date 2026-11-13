import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { PlatformFields, SpaceFields } from './list-business.page';
import { AddressField } from './address-field';
import { ShellPage } from './shell.page';

/** `/my-business/listing`: the listing editor (L2-087, L2-088). */
export class EditListingPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly form: Locator;
  readonly name: Locator;
  readonly tagline: Locator;
  readonly counter: Locator;
  readonly about: Locator;
  readonly category: Locator;
  readonly where: Locator;
  readonly hours: Locator;
  readonly website: Locator;
  readonly highlight: Locator;
  readonly save: Locator;
  readonly discard: Locator;
  readonly status: Locator;
  readonly summary: Locator;
  readonly success: Locator;
  /** "Your address": the listing's address as text that cannot be edited (L2-244 AC4). */
  readonly address: AddressField;
  readonly conflict: Locator;
  readonly preview: Locator;
  readonly photoTiles: Locator;
  readonly photoError: Locator;
  readonly photoHelp: Locator;
  readonly picker: Locator;
  readonly addPhoto: Locator;
  readonly alert: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly loading: Locator;
  /** A space's own fields (L2-209). */
  readonly space: SpaceFields;
  readonly spacePreview: Locator;
  /** A platform's own fields (L2-256). */
  readonly platform: PlatformFields;
  readonly previewTag: Locator;
  readonly previewHeading: Locator;
  readonly platformName: Locator;
  readonly platformTagline: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.form = this.main.locator('form');
    this.name = this.form.getByLabel('Business name');
    this.tagline = this.form.getByLabel('One line on what you do');
    this.counter = this.form.locator('.field__counter');
    this.about = this.form.getByLabel('About', { exact: true });
    this.category = this.form.getByLabel('Category');
    this.where = this.form.getByLabel('Where');
    this.hours = this.form.getByLabel('Hours');
    this.website = this.form.getByLabel('Website');
    this.highlight = this.form.getByLabel('Highlight');
    this.save = this.form.getByRole('button', { name: 'Save listing' });
    this.discard = this.form.getByRole('button', { name: 'Discard changes' });
    this.status = this.form.locator('.inline-status');
    this.summary = this.form.locator('.form-summary');
    this.success = this.form.locator('.alert--success');
    this.address = new AddressField(this.form);
    this.conflict = this.form
      .locator('.alert--danger')
      .filter({ hasText: 'changed since you opened' });
    this.preview = this.main.locator('aside[aria-labelledby="pv"] .biz-card');
    this.photoTiles = this.form.locator('fieldset ul > li').filter({ has: page.locator('.media') });
    this.photoError = this.form.locator('fieldset .field__error');
    this.photoHelp = this.form
      .locator('fieldset .field__help')
      .filter({ hasText: 'Up to 6 photos' });
    this.picker = this.form.getByLabel('Choose a photo');
    this.addPhoto = this.form.getByRole('button', { name: 'Add photo' });
    this.alert = this.main.getByRole('alert');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.loading = this.main.getByRole('status');
    this.space = new SpaceFields(page, this.main);
    this.spacePreview = this.main.locator('aside[aria-labelledby="pv"] .space-card');
    this.platform = new PlatformFields(this.main);
    this.previewTag = this.preview.locator('.media__tag');
    this.previewHeading = this.main.locator('#pv');
    this.platformName = this.main.locator('#name');
    this.platformTagline = this.main.locator('#tagline');
  }

  section(name: string): Locator {
    return this.main
      .getByRole('navigation', { name: 'My business sections' })
      .getByRole('link', { name });
  }

  fieldError(field: Locator): Locator {
    return field
      .locator('xpath=ancestor::div[contains(@class,"field")][1]')
      .locator('.field__error');
  }

  /** The handle a photo is dragged by: a pointer affordance, hidden from the keyboard and assistive technology. */
  dragHandle(position: number): Locator {
    return this.photoTiles.nth(position - 1).locator('[cdkDragHandle], .cdk-drag-handle');
  }

  /**
   * Drags the photo at `from` by its handle and drops it on the photo at `to`, as a hand does: press,
   * move in steps so the drag starts, release.
   */
  async dragPhoto(from: number, to: number): Promise<void> {
    const handle = await this.dragHandle(from).boundingBox();
    const target = await this.photoTiles.nth(to - 1).boundingBox();
    if (!handle || !target)
      throw new Error('The photo to drag, or the place to drop it, is not on screen.');
    const start = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
    // The handle sits under the photo, so the pointer ends as far inside the target as it started in its own tile.
    const source = await this.photoTiles.nth(from - 1).boundingBox();
    const end = { x: target.x + (start.x - source!.x), y: target.y + (start.y - source!.y) };
    await this.page.mouse.move(start.x, start.y);
    await this.page.mouse.down();
    await this.page.mouse.move(start.x + 8, start.y + 4, { steps: 4 });
    await this.page.mouse.move(end.x, end.y, { steps: 12 });
    await this.page.mouse.up();
  }

  photoAlt(position: number): Locator {
    return this.form.getByLabel(`Describe photo ${position}`);
  }

  moveEarlier(position: number): Locator {
    return this.form.getByRole('button', { name: `Move photo ${position} earlier` });
  }

  moveLater(position: number): Locator {
    return this.form.getByRole('button', { name: `Move photo ${position} later` });
  }

  remove(position: number): Locator {
    return this.form.getByRole('button', { name: `Remove photo ${position}` });
  }

  /** Types the "About" text and leaves the control, so that it is shown at rest. */
  async typeAboutAndLeave(text: string): Promise<void> {
    await this.about.fill(text);
    await this.about.blur();
    // Typing leaves the text scrolled to its end.
    await this.about.evaluate((control) => (control.scrollTop = 0));
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
