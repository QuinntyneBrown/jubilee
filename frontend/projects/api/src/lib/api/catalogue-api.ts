import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DeletedItem,
  MeetingHours,
  MeetingHoursInput,
  OwnerProduct,
  OwnerProducts,
  OwnerService,
  OwnerServices,
  ProductInput,
  ProductPhoto,
  ServiceInput,
} from '../models/catalogue';

/** Contract of the owner's catalogue (L2-089 to L2-095). */
export interface CatalogueApi {
  products(): Observable<OwnerProducts>;
  saveProduct(id: string | null, input: ProductInput): Observable<OwnerProduct>;
  /** Uploads a photo before the product is saved; the save sends its id (L2-091 AC9). */
  uploadProductPhoto(file: File): Observable<ProductPhoto>;
  deleteProduct(id: string): Observable<DeletedItem>;
  moveProduct(id: string, position: number): Observable<OwnerProducts>;
  services(): Observable<OwnerServices>;
  saveService(id: string | null, input: ServiceInput): Observable<OwnerService>;
  deleteService(id: string): Observable<DeletedItem>;
  moveService(id: string, position: number): Observable<OwnerServices>;
  /** Replaces the hours in which meetings can be booked (L2-220). */
  setMeetingHours(input: MeetingHoursInput): Observable<MeetingHours>;
}

export const CATALOGUE_API = new InjectionToken<CatalogueApi>('CATALOGUE_API');

@Injectable()
export class HttpCatalogueApi implements CatalogueApi {
  private readonly http = inject(HttpClient);

  products(): Observable<OwnerProducts> {
    return this.http.get<OwnerProducts>('/api/my-business/products');
  }

  saveProduct(id: string | null, input: ProductInput): Observable<OwnerProduct> {
    return id
      ? this.http.put<OwnerProduct>(`/api/my-business/products/${id}`, input)
      : this.http.post<OwnerProduct>('/api/my-business/products', input);
  }

  uploadProductPhoto(file: File): Observable<ProductPhoto> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ProductPhoto>('/api/my-business/products/photos', form);
  }

  deleteProduct(id: string): Observable<DeletedItem> {
    return this.http.delete<DeletedItem>(`/api/my-business/products/${id}`);
  }

  moveProduct(id: string, position: number): Observable<OwnerProducts> {
    return this.http.put<OwnerProducts>(`/api/my-business/products/${id}/position`, { position });
  }

  services(): Observable<OwnerServices> {
    return this.http.get<OwnerServices>('/api/my-business/services');
  }

  saveService(id: string | null, input: ServiceInput): Observable<OwnerService> {
    return id
      ? this.http.put<OwnerService>(`/api/my-business/services/${id}`, input)
      : this.http.post<OwnerService>('/api/my-business/services', input);
  }

  deleteService(id: string): Observable<DeletedItem> {
    return this.http.delete<DeletedItem>(`/api/my-business/services/${id}`);
  }

  moveService(id: string, position: number): Observable<OwnerServices> {
    return this.http.put<OwnerServices>(`/api/my-business/services/${id}/position`, { position });
  }

  setMeetingHours(input: MeetingHoursInput): Observable<MeetingHours> {
    return this.http.put<MeetingHours>('/api/my-business/meeting-hours', input);
  }
}
