// src/app/services/api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PredictResponse } from '../shared/models';

// ---- Tipos do chat multi-turno (compatíveis com o backend) ----
export interface ChatStartResponse {
  thread_id: string;  // id da thread criada pelo backend
  message: string;    // primeira resposta do assistente
}

export interface ChatContinueResponse {
  thread_id: string;  // normalmente o mesmo id; pode rotacionar
  reply: string;      // resposta do assistente à última mensagem do usuário
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ajuste para usar environments se quiser
  private base = 'http://localhost:8000';

  // --------- PREDICT ---------
  predictStructured(features: number[]): Observable<PredictResponse> {
    // Garante que só manda números válidos
    const clean = features.map(v => Number(v));
    return this.http.post<PredictResponse>(
      `${this.base}/predict-structured`,
      { features: clean }
    );
  }

  // --------- CHAT MULTI-TURNO ---------
  /**
   * Inicia uma nova conversa com o assistente.
   * Retorna a primeira mensagem e o thread_id.
   */
  chatStart(diagnosis: string, confidence: number): Observable<ChatStartResponse> {
    return this.http.post<ChatStartResponse>(
      `${this.base}/chat/start`,
      { diagnosis, confidence }
    );
  }

  /**
   * Envia uma mensagem em uma conversa já iniciada.
   * É necessário informar o thread_id retornado pelo chatStart.
   */
  chatContinue(thread_id: string, user_text: string): Observable<ChatContinueResponse> {
    return this.http.post<ChatContinueResponse>(
      `${this.base}/chat/continue`,
      { thread_id, user_text }
    );
  }
}
