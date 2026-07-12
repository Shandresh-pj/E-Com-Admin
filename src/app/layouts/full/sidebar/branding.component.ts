import { Component } from '@angular/core';
import { CoreService } from 'src/app/services/core.service';

@Component({
  selector: 'app-branding',
  imports: [],
  styles: [`
    .premium-brand-link {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }
    .brand-orb {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #4f46e5, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
      flex-shrink: 0;
      font-size: 18px;
    }
    .brand-text { display: flex; flex-direction: column; }
    .brand-name {
      font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif;
      font-size: 18px;
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .brand-sub {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
  `],
  template: `
    <a href="/" class="premium-brand-link" aria-label="SVK E-Com Home">
      <div class="brand-orb">⚡</div>
      <div class="brand-text">
        <span class="brand-name">SVK</span>
        <span class="brand-sub">E-Com PRO</span>
      </div>
    </a>
  `,
})
export class BrandingComponent {
  options = this.settings.getOptions();
  constructor(private settings: CoreService) {}
}
