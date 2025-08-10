import { Component, EventEmitter, Output, WritableSignal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field'; // <-- ADICIONADO
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';

import { ApiService } from '../services/api.service';           // <-- caminho corrigido
import { PredictResponse } from '../shared/models';             // <-- caminho corrigido
import { FEATURES_META, FEATURES_ORDER } from '../shared/features'; // <-- caminho corrigido
import { ChatbotResponseComponent } from './chatbot-response.component';

@Component({
  selector: 'app-structured-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSnackBarModule, MatProgressBarModule, MatChipsModule, MatExpansionModule, MatIconModule,
    ChatbotResponseComponent,
  ],
  template: `
  <mat-card class="container">
    <h1>OncoScope – Análise Estruturada</h1>
    <p class="sub">Preencha os 30 campos do exame e envie para análise.</p>

    <div class="actions">
      <button mat-stroked-button color="primary" (click)="fillExample()" [disabled]="loading()">Pré-preencher exemplo</button>
      <button mat-button (click)="form.reset()" [disabled]="loading()">Limpar</button>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-grid">
      <mat-accordion multi>
        <mat-expansion-panel expanded>
          <mat-expansion-panel-header>
            <mat-panel-title>Médias</mat-panel-title>
          </mat-expansion-panel-header>
          <div class="grid">
            <ng-container *ngFor="let f of group('Médias')">
              <mat-form-field appearance="outline">
                <mat-label>{{ f.label }}</mat-label>
                <input matInput type="number" step="any" [placeholder]="f.hint || 'ex: 14.2'" [formControlName]="f.key">
                <mat-error *ngIf="form.get(f.key)?.hasError('required')">Obrigatório</mat-error>
              </mat-form-field>
            </ng-container>
          </div>
        </mat-expansion-panel>

        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>Erro (SE)</mat-panel-title>
          </mat-expansion-panel-header>
          <div class="grid">
            <ng-container *ngFor="let f of group('Erro (SE)')">
              <mat-form-field appearance="outline">
                <mat-label>{{ f.label }}</mat-label>
                <input matInput type="number" step="any" [placeholder]="f.hint || 'ex: 0.352'" [formControlName]="f.key">
                <mat-error *ngIf="form.get(f.key)?.hasError('required')">Obrigatório</mat-error>
              </mat-form-field>
            </ng-container>
          </div>
        </mat-expansion-panel>

        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>Pior (worst)</mat-panel-title>
          </mat-expansion-panel-header>
          <div class="grid">
            <ng-container *ngFor="let f of group('Pior (worst)')">
              <mat-form-field appearance="outline">
                <mat-label>{{ f.label }}</mat-label>
                <input matInput type="number" step="any" [placeholder]="f.hint || 'ex: 16.1'" [formControlName]="f.key">
                <mat-error *ngIf="form.get(f.key)?.hasError('required')">Obrigatório</mat-error>
              </mat-form-field>
            </ng-container>
          </div>
        </mat-expansion-panel>
      </mat-accordion>

      <div class="submit">
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading()">
          <mat-icon>play_arrow</mat-icon>
          Analisar
        </button>
      </div>
    </form>

    <mat-card *ngIf="result()" class="result">
      <h2>Resultado</h2>
      <div class="row">
        <mat-chip-set>
          <mat-chip [color]="result()?.diagnosis === 'Maligno' ? 'warn' : 'primary'" selected>
            {{ result()?.diagnosis }}
          </mat-chip>
        </mat-chip-set>
      </div>
      <div class="row conf">
        <span>Confiança: {{ (result()?.confidence ?? 0) | percent:'1.0-2' }}</span>
        <mat-progress-bar [value]="(result()?.confidence ?? 0) * 100"></mat-progress-bar>
      </div>
    </mat-card>

    <app-chatbot-response [message]="chatMessage()"></app-chatbot-response>
  </mat-card>
  `,
  styles: [`
    .container { max-width: 1100px; margin: 24px auto; padding: 24px; }
    h1 { margin: 0 0 8px; font-weight: 700; }
    .sub { margin: 0 0 16px; color: #666; }
    .actions { display:flex; gap:12px; margin-bottom: 16px; }
    .form-grid { display:block; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 12px;
      margin: 12px 0;
    }
    .submit { margin-top: 12px; display:flex; justify-content: flex-end; }
    .result { margin-top: 16px; }
    .row { display:flex; align-items:center; gap:12px; }
    .conf { flex-direction: column; align-items: stretch; }
  `]
})
export class StructuredFormComponent {
  @Output() chatReady = new EventEmitter<string>();

  readonly meta = FEATURES_META;
  loading: WritableSignal<boolean> = signal(false);
  result = signal<PredictResponse | null>(null);
  chatMessage = signal<string>('');

  form!: FormGroup;

  constructor(private fb: FormBuilder, private api: ApiService, private snack: MatSnackBar) {
    const controls: Record<string, any> = {};
    for (const k of FEATURES_ORDER) controls[k] = [null as number | null, Validators.required];
    this.form = this.fb.group(controls);
  }

  group(g: 'Médias' | 'Erro (SE)' | 'Pior (worst)') {
    return this.meta.filter(m => m.group === g);
  }

  private toPayload(): number[] {
    const raw = this.form.getRawValue() as Record<string, number | null>;
    return FEATURES_ORDER.map(k => Number(raw[k]));
  }

  fillExample() {
    const demo = [14.2,18.3,92.4,654.4,0.086,0.070,0.025,0.030,0.181,0.062,0.352,1.21,2.56,40.9,0.005,0.025,0.017,0.006,0.020,0.003,16.1,25.4,107.2,880.7,0.131,0.240,0.186,0.071,0.265,0.095];
    const patch: Record<string, number> = {};
    FEATURES_ORDER.forEach((k, i) => patch[k] = demo[i]);
    this.form.patchValue(patch);
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.result.set(null);
    this.chatMessage.set('');

    const features = this.toPayload();
    this.api.predictStructured(features).subscribe({
      next: (res) => {
        this.result.set(res);
        this.api.chat(res.diagnosis, res.confidence).subscribe({
          next: (c) => {
            this.chatMessage.set(c.message);
            this.chatReady.emit(c.message);
            this.loading.set(false);
          },
          error: (e) => {
            this.loading.set(false);
            this.snack.open(`Erro no chat: ${e?.error?.detail || e.message}`, 'OK', { duration: 5000 });
          }
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.snack.open(`Erro na previsão: ${err?.error?.detail || err.message}`, 'OK', { duration: 6000 });
      }
    });
  }
}
