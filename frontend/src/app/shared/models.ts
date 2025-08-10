// Diagnóstico retornado pelo backend
export type Diagnosis = 'Benigno' | 'Maligno';

// ---- PREDICT ----
export interface PredictResponse {
  diagnosis: Diagnosis | string; // mantém string para tolerar variações
  confidence: number;            // 0..1
}

// ---- CHAT (LEGADO: /chat) ----
export interface ChatResponse {
  message: string;               // mensagem única de acolhimento
}

// ---- CHAT (MULTI-TURNO) ----
// Usado em /chat/start
export interface ChatStartResponse {
  thread_id: string;             // id da thread criada
  message: string;               // primeira resposta do assistente
}

// Usado em /chat/continue
export interface ChatContinueResponse {
  thread_id: string;             // normalmente o mesmo id
  reply: string;                 // resposta do assistente
}

// Útil para histórico no front
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
