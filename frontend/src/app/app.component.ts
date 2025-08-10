import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { StructuredFormComponent } from './components/structured-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MatToolbarModule, MatIconModule, StructuredFormComponent],
  template: `
    <mat-toolbar color="primary">
      <mat-icon>analytics</mat-icon>
      <span style="margin-left:8px;">OncoScope</span>
    </mat-toolbar>
    <main class="page">
      <app-structured-form></app-structured-form>
    </main>
  `,
  styles: [`.page { padding:16px; }`]
})
export class AppComponent {}
