import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { BusinessCard } from './business-card';
import { ShellPage } from './shell.page';

export class WelcomePage extends ShellPage implements Screen {
  readonly hero: Locator;
  readonly tagline: Locator;
  readonly heading: Locator;
  readonly countLine: Locator;
  readonly joinFree: Locator;
  readonly browseBusinesses: Locator;
  readonly categoryLinks: Locator;
  readonly howItWorks: Locator;
  readonly steps: Locator;
  readonly featured: Locator;
  readonly featuredCards: Locator;
  readonly browseAll: Locator;
  readonly ownABusiness: Locator;
  readonly listYourBusiness: Locator;

  constructor(page: Page) {
    super(page);
    this.hero = this.main.locator('section.hero');
    this.tagline = this.hero.locator('.hero__greeting');
    this.heading = this.hero.getByRole('heading', { level: 1 });
    this.countLine = this.hero.locator('.hero__sub');
    this.joinFree = this.hero.getByRole('link', { name: 'Join free' });
    this.browseBusinesses = this.hero.getByRole('link', { name: 'Browse businesses' });
    this.categoryLinks = this.hero.locator('.chip-row a.chip');
    this.howItWorks = this.main.getByRole('region', { name: 'How Jubilee works' });
    this.steps = this.howItWorks.locator('.steps > li h3');
    this.featured = this.main.getByRole('region', { name: 'Featured this week' });
    this.featuredCards = this.featured.locator('a.biz-card');
    this.browseAll = this.featured.getByRole('link', { name: /^Browse all/ });
    this.ownABusiness = this.main.getByRole('region', { name: 'Own a business?' });
    this.listYourBusiness = this.ownABusiness.getByRole('link', { name: 'List your business' });
  }

  featuredCard(index: number): BusinessCard {
    return new BusinessCard(this.featuredCards.nth(index));
  }

  async ready(): Promise<void> {
    await this.featuredCards.first().waitFor();
  }

  regions(): Region[] {
    return [
      ...this.chromeRegions(),
      { name: 'hero', locator: this.hero },
      { name: 'how-it-works', locator: this.howItWorks },
      { name: 'featured', locator: this.featured },
      { name: 'own-a-business', locator: this.ownABusiness },
    ];
  }
}
