export type Diagnosis = 'Benigno' | 'Maligno';

export interface PredictResponse {
  diagnosis: Diagnosis;
  confidence: number; // 0..1
}

export interface ChatResponse {
  message: string;
}
