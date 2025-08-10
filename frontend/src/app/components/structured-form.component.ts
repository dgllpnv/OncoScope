import { Component, EventEmitter, Output, WritableSignal, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { ApiService, ChatStartResponse, ChatContinueResponse } from '../services/api.service';
import { PredictResponse } from '../shared/models';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-structured-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSnackBarModule, MatProgressBarModule, MatChipsModule, MatIconModule,
  ],
  templateUrl: './structured-form.component.html',
  styleUrls: ['./structured-form.component.css']
})
export class StructuredFormComponent implements OnInit {
  @Output() chatReady = new EventEmitter<string>();

  loading: WritableSignal<boolean> = signal(false);
  result = signal<PredictResponse | null>(null);
  chatMessages = signal<{ role: string; text: string }[]>([]);
  threadId: string | null = null;

  form!: FormGroup;
  fields: { key: string; label: string; hint: string }[] = [];

  userMessage = '';

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snack: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.http.get<{ selected_features: string[] }>('/assets/selected_features.json').subscribe({
      next: (data) => {
        // Definindo os rótulos manualmente
        const labelsPt: Record<string, string> = {
        "worst_radius": "Maior raio",
        "worst_texture": "Textura",
        "worst_perimeter": "Perímetro",
        "worst_area": "Área",
        "worst_smoothness": "Suavidade",
        "mean_radius": "Raio médio",
        "mean_texture": "Textura média",
        "mean_perimeter": "Perímetro médio",
        "mean_area": "Área média",
        "mean_concave_points": "Pontos côncavos médios"
};

        this.fields = data.selected_features.map((feat) => ({
          key: feat.replace(/\s+/g, '_').toLowerCase(),
          label: labelsPt[feat] || feat,
          hint: 'ex: 0.0'
        }));

        const controls: Record<string, any> = {};
        for (const f of this.fields) controls[f.key] = [null, Validators.required];
        this.form = this.fb.group(controls);
      },
      error: (err) => {
        this.snack.open(`Erro ao carregar campos: ${err.message}`, 'OK', { duration: 5000 });
      }
    });
  }

  trackKey = (_: number, item: { key: string }) => item.key;

  private toPayload(): number[] {
    const raw = this.form.getRawValue() as Record<string, number | null>;
    return this.fields.map(f => {
      const val = Number(raw[f.key]);
      if (isNaN(val)) throw new Error(`O campo ${f.label} está vazio ou inválido`);
      return val;
    });
  }

  clear() {
    this.form.reset();
    this.result.set(null);
    this.chatMessages.set([]);
    this.threadId = null;
    this.userMessage = '';
  }

  fillExampleMal() {
    const demo = [16.1, 25.4, 107.2, 880.7, 0.131, 14.2, 18.3, 92.4, 654.4, 0.181];
    const patch: Record<string, number> = {};
    this.fields.forEach((f, i) => patch[f.key] = demo[i]);
    this.form.patchValue(patch);
    this.snack.open('Exemplo maligno preenchido.', 'OK', { duration: 2500 });
  }

  fillExampleBen() {
    const demo = [11.5, 13.5, 72.0, 400.0, 0.089, 10.6, 11.8, 67.0, 350.0, 0.05];
    const patch: Record<string, number> = {};
    this.fields.forEach((f, i) => patch[f.key] = demo[i]);
    this.form.patchValue(patch);
    this.snack.open('Exemplo benigno preenchido.', 'OK', { duration: 2500 });
  }

  onSubmit() {
    if (this.form.invalid || this.loading()) return;

    let features: number[];
    try {
      features = this.toPayload();
    } catch (err: any) {
      this.snack.open(err.message, 'OK', { duration: 4000 });
      return;
    }

    this.loading.set(true);
    this.result.set(null);
    this.chatMessages.set([]);
    this.threadId = null;

    this.api.predictStructured(features).subscribe({
      next: (res) => {
        this.result.set(res);
        this.api.chatStart(res.diagnosis, res.confidence).subscribe({
          next: (chatStart: ChatStartResponse) => {
            this.threadId = chatStart.thread_id;
            this.chatMessages.set([{ role: 'bot', text: chatStart.message }]);
            this.loading.set(false);
            setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50);
          },
          error: (e: any) => {
            this.loading.set(false);
            this.snack.open(`Erro ao iniciar chat: ${e?.error?.detail || e.message}`, 'OK', { duration: 5000 });
          }
        });
      },
      error: (err: any) => {
        this.loading.set(false);
        this.snack.open(`Erro na previsão: ${err?.error?.detail || err.message}`, 'OK', { duration: 6000 });
      }
    });
  }

  sendMessage() {
    if (!this.threadId || !this.userMessage.trim()) return;

    const msg = this.userMessage.trim();
    this.chatMessages.update(msgs => [...msgs, { role: 'user', text: msg }]);
    this.userMessage = '';

    this.api.chatContinue(this.threadId, msg).subscribe({
      next: (reply: ChatContinueResponse) => {
        this.chatMessages.update(msgs => [...msgs, { role: 'bot', text: reply.reply }]);
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50);
      },
      error: (e: any) => {
        this.snack.open(`Erro ao continuar chat: ${e?.error?.detail || e.message}`, 'OK', { duration: 5000 });
      }
    });
  }
}
