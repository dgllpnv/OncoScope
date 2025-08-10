import {
  Component, Input, OnChanges, SimpleChanges,
  WritableSignal, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ApiService, ChatContinueResponse } from '../services/api.service';

type ChatMsg = { role: 'assistant' | 'user'; content: string };

@Component({
  selector: 'app-chatbot-panel',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressBarModule
  ],
  template: `
  <mat-card class="chat">
    <div class="head">
      <h3><mat-icon>chat_bubble</mat-icon> Acolhimento</h3>
      <span class="disclaimer">Conversa de apoio emocional. Não substitui avaliação médica.</span>
    </div>

    <div class="history" #scroller>
      <ng-container *ngFor="let m of messages(); trackBy: track">
        <div class="msg" [class.user]="m.role==='user'" [class.assistant]="m.role==='assistant'">
          <div class="bubble">
            <span class="who" *ngIf="m.role==='assistant'"><mat-icon>volunteer_activism</mat-icon> Assistente</span>
            <span class="who" *ngIf="m.role==='user'"><mat-icon>person</mat-icon> Você</span>
            <div class="content">{{ m.content }}</div>
          </div>
        </div>
      </ng-container>

      <div *ngIf="loading()" class="loading">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <small>Escrevendo resposta…</small>
      </div>
    </div>

    <form class="composer" [formGroup]="form" (ngSubmit)="send(scroller)">
      <mat-form-field appearance="outline" class="input">
        <mat-label>Escreva sua mensagem</mat-label>
        <input matInput formControlName="text" placeholder="Ex.: Estou preocupado(a), o que posso fazer agora?">
      </mat-form-field>
      <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || loading() || !threadId">
        <mat-icon>send</mat-icon>
        Enviar
      </button>
    </form>

    <div class="foot">
      <mat-icon>health_and_safety</mat-icon>
      <small>Em caso de emergência, procure atendimento médico imediatamente.</small>
    </div>
  </mat-card>
  `,
  styles: [`
    .chat { max-width: 900px; margin: 16px auto; padding: 0; display: flex; flex-direction: column; }
    .head { padding: 16px 16px 0 16px; display:flex; flex-direction: column; gap:4px; }
    .head h3 { margin:0; font-weight: 700; display:flex; align-items:center; gap:8px; }
    .disclaimer { color:#666; font-size: 12px; }
    .history { padding: 12px 16px; max-height: 420px; overflow: auto; display:flex; flex-direction: column; gap: 10px; }
    .msg { display:flex; }
    .msg.user { justify-content: flex-end; }
    .bubble { max-width: 75%; border-radius: 14px; padding: 10px 12px; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
    .assistant .bubble { background: #f6f7fb; border-top-left-radius: 4px; }
    .user .bubble { background: #e8f4ff; border-top-right-radius: 4px; }
    .who { display:flex; align-items:center; gap:6px; color:#555; font-size: 12px; margin-bottom: 4px; }
    .content { white-space: pre-wrap; line-height: 1.35; }
    .loading { padding: 0 16px 8px 16px; display:flex; flex-direction: column; gap:4px; }
    .composer { padding: 8px 16px 16px 16px; display:flex; gap:10px; }
    .composer .input { flex:1; }
    .foot { padding: 6px 16px 14px 16px; display:flex; align-items:center; gap:8px; color:#666; }
  `]
})
export class ChatbotPanelComponent implements OnChanges {
  @Input() initialMessage: string | null = null;
  @Input() threadId: string | null = null;

  messages: WritableSignal<ChatMsg[]> = signal<ChatMsg[]>([]);
  loading = signal(false);

  form!: FormGroup; // <-- declara aqui

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snack: MatSnackBar
  ) {
    // <-- inicializa dentro do constructor (depois da injeção)
    this.form = this.fb.group({
      text: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['threadId']) this.messages.set([]); // reset ao trocar de thread

    const msg = (this.initialMessage || '').trim();
    if (msg && !this.messages().some(m => m.role === 'assistant' && m.content === msg)) {
      this.messages.update(arr => [...arr, { role: 'assistant', content: msg }]);
    }
  }

  track = (i: number) => i;

  send(scroller: HTMLElement) {
    if (this.form.invalid || this.loading() || !this.threadId) return;

    const text = (this.form.value.text || '').toString().trim();
    if (!text) return;

    this.messages.update(arr => [...arr, { role: 'user', content: text }]);
    this.form.reset();
    this.loading.set(true);
    queueMicrotask(() => scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' }));

    this.api.chatContinue(this.threadId, text).subscribe({
      next: (res: ChatContinueResponse) => {
        if (res.thread_id) this.threadId = res.thread_id;
        const reply = (res.reply || '').trim() || 'Desculpe, não consegui responder agora.';
        this.messages.update(arr => [...arr, { role: 'assistant', content: reply }]);
        this.loading.set(false);
        queueMicrotask(() => scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' }));
      },
      error: (err) => {
        this.loading.set(false);
        this.snack.open(`Erro ao enviar mensagem: ${err?.error?.detail || err.message}`, 'OK', { duration: 5000 });
      }
    });
  }
}
