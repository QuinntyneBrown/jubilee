import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Availability,
  BookMeetingRequest,
  BookedRequest,
  BookingOptions,
  QuoteOptions,
  RequestQuoteRequest,
} from '../models/requests';

/** Contract of the request endpoints a member uses to ask a business for something (L2-043). */
export interface RequestsApi {
  bookingOptions(slug: string): Observable<BookingOptions>;
  availability(slug: string, serviceId: string, day: string): Observable<Availability>;
  bookMeeting(request: BookMeetingRequest): Observable<BookedRequest>;
  quoteOptions(slug: string): Observable<QuoteOptions>;
  requestQuote(request: RequestQuoteRequest): Observable<BookedRequest>;
  /** The address of the calendar file of a confirmed booking. */
  calendarUrl(requestId: string): string;
}

export const REQUESTS_API = new InjectionToken<RequestsApi>('REQUESTS_API');

@Injectable()
export class HttpRequestsApi implements RequestsApi {
  private readonly http = inject(HttpClient);

  bookingOptions(slug: string): Observable<BookingOptions> {
    return this.http.get<BookingOptions>(`/api/listings/${encodeURIComponent(slug)}/booking`);
  }

  availability(slug: string, serviceId: string, day: string): Observable<Availability> {
    const params = new HttpParams().set('serviceId', serviceId).set('day', day);
    return this.http.get<Availability>(`/api/listings/${encodeURIComponent(slug)}/availability`, {
      params,
    });
  }

  bookMeeting(request: BookMeetingRequest): Observable<BookedRequest> {
    return this.http.post<BookedRequest>('/api/requests/bookings', request);
  }

  quoteOptions(slug: string): Observable<QuoteOptions> {
    return this.http.get<QuoteOptions>(`/api/listings/${encodeURIComponent(slug)}/quote`);
  }

  requestQuote(request: RequestQuoteRequest): Observable<BookedRequest> {
    return this.http.post<BookedRequest>('/api/requests/quotes', request);
  }

  calendarUrl(requestId: string): string {
    return `/api/requests/${requestId}/calendar.ics`;
  }
}
