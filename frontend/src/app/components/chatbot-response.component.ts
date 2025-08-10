import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-chatbot-response',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <mat-card *ngIf="message" class="chat-card">
      <mat-card-header>
        <mat-icon>support_agent</mat-icon>
        <div class="title">Assistente</div>
      </mat-card-header>
      <mat-card-content>
        <p>{{ message }}</p>
        <small class="disclaimer">
          *Mensagem de apoio automatizada. Não substitui avaliação médica.*
        </small>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .chat-card { margin-top: 16px; }
    mat-card-header { display:flex; align-items:center; gap:8px; }
    .title { font-weight: 600; }
    .disclaimer { color: #777; }
  `]
})
export class ChatbotResponseComponent {
  @Input() message = '';
}
