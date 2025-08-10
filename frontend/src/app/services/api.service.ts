import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment as env } from '../../environments/environment';
import { Observable } from 'rxjs';
import { PredictResponse, ChatResponse } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = env.apiBaseUrl;

  constructor(private http: HttpClient) {}

  predictStructured(features: number[]): Observable<PredictResponse> {
    return this.http.post<PredictResponse>(`${this.base}/predict-structured`, { features });
  }

  chat(diagnosis: string, confidence: number): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.base}/chat`, { diagnosis, confidence });
  }
}
