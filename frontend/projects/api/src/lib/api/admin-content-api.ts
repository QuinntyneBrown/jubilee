import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ContentPage, ContentSection, ContentSlug } from './content-api';

/** One policy page in the admin application's list (L2-241 AC1). */
export interface AdminContentRow {
  slug: ContentSlug;
  title: string;
  version: number;
  publishedAt: string;
  /** The administrator's name, or "built-in" for the first version. */
  publishedBy: string;
  keptVersions: number;
}

/** A kept version of a policy page, newest first (L2-107 AC2). */
export interface ContentVersionRow {
  number: number;
  title: string;
  publishedAt: string;
  publishedBy: string;
  published: boolean;
}

/** The published text of one page with its kept versions, for the editor (L2-241 AC2). */
export interface AdminContent {
  published: ContentPage;
  publishedBy: string;
  versions: ContentVersionRow[];
}

/** What the editor publishes; `basedOn` is the version it started from (ADR 0067). */
export interface PublishContent {
  title: string;
  lead: string;
  sections: ContentSection[];
  basedOn: number;
}

/** Contract of the policies screens of the admin application (L2-241). */
export interface AdminContentApi {
  list(): Observable<AdminContentRow[]>;
  get(slug: ContentSlug): Observable<AdminContent>;
  publish(slug: ContentSlug, text: PublishContent): Observable<ContentPage>;
}

export const ADMIN_CONTENT_API = new InjectionToken<AdminContentApi>('ADMIN_CONTENT_API');

@Injectable()
export class HttpAdminContentApi implements AdminContentApi {
  private readonly http = inject(HttpClient);

  list(): Observable<AdminContentRow[]> {
    return this.http.get<AdminContentRow[]>('/api/admin/content');
  }

  get(slug: ContentSlug): Observable<AdminContent> {
    return this.http.get<AdminContent>(`/api/admin/content/${slug}`);
  }

  publish(slug: ContentSlug, text: PublishContent): Observable<ContentPage> {
    return this.http.post<ContentPage>(`/api/admin/content/${slug}/versions`, text);
  }
}

/** "Version 2 · published 9 Nov 2026 by Daniel Osei", or "Version 1 · built in · 2 Nov 2026". */
export function versionLine(version: number, publishedBy: string, day: string): string {
  return publishedBy === 'built-in'
    ? `Version ${version} · built in · ${day}`
    : `Version ${version} · published ${day} by ${publishedBy}`;
}
