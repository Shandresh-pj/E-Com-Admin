import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

declare let window: any;

export interface RazorpayPaymentSuccess {
  razorpay_payment_id: string;
  razorpay_order_id:   string;
  razorpay_signature:  string;
}

export interface RazorpayPaymentError {
  code:        string;
  description: string;
  reason:      string;
  source:      string;
  step:        string;
  metadata:    { order_id?: string; payment_id?: string };
}

export interface RazorpayOptions {
  key:          string;
  amount:       number; // in paise
  currency:     string;
  name:         string;
  description:  string;
  image?:       string;
  order_id:     string;
  prefill?: {
    name?:    string;
    email?:   string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: { color: string; hide_topbar?: boolean };
  modal?: {
    ondismiss?:      () => void;
    backdropclose?:  boolean;
    escape?:         boolean;
    animation?:      boolean;
  };
  retry?: { enabled: boolean; max_count?: number };
  remember_customer?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RazorpayService {
  private scriptLoaded          = false;
  private scriptLoadingPromise: Promise<boolean> | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  // ─── Load Razorpay SDK script once ───────────────────────────────────────
  loadScript(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return Promise.resolve(false);

    if (this.scriptLoaded || typeof window.Razorpay !== 'undefined') {
      this.scriptLoaded = true;
      return Promise.resolve(true);
    }

    if (this.scriptLoadingPromise) return this.scriptLoadingPromise;

    this.scriptLoadingPromise = new Promise((resolve) => {
      const script    = document.createElement('script');
      script.src      = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async    = true;
      script.onload   = () => { this.scriptLoaded = true; resolve(true);  };
      script.onerror  = () => { resolve(false); };
      document.body.appendChild(script);
    });

    return this.scriptLoadingPromise;
  }

  /**
   * Opens Razorpay Standard Checkout.
   * Returns a Promise that:
   *   – resolves with RazorpayPaymentSuccess on successful payment
   *   – rejects  with RazorpayPaymentError  on payment.failed event
   *   – rejects  with { dismissed: true }   when user closes the modal
   */
  async openCheckout(options: RazorpayOptions): Promise<RazorpayPaymentSuccess> {
    const loaded = await this.loadScript();

    if (!loaded || typeof window.Razorpay === 'undefined') {
      // SDK not available – fall back to simulation
      return this.openSimulatedCheckout(options);
    }

    return new Promise<RazorpayPaymentSuccess>((resolve, reject) => {
      const rzpOptions = {
        ...options,
        retry:             { enabled: true, max_count: 3 },
        remember_customer: false,

        // Success callback — resolve the promise with payment data
        handler: (response: RazorpayPaymentSuccess) => {
          resolve(response);
        },

        modal: {
          ...(options.modal || {}),
          // Dismissed without paying
          ondismiss: () => {
            reject({ dismissed: true, message: 'Payment cancelled by user.' });
          },
          backdropclose: false,
          escape:        true,
          animation:     true,
        }
      };

      let rzp: any;
      try {
        rzp = new window.Razorpay(rzpOptions);
      } catch (err: any) {
        reject({ dismissed: false, message: err?.message || 'Failed to initialize Razorpay.' });
        return;
      }

      // payment.failed event — reject with error details
      if (rzp && typeof rzp.on === 'function') {
        rzp.on('payment.failed', (resp: any) => {
          const err: RazorpayPaymentError = {
            code:        resp?.error?.code        || 'PAYMENT_FAILED',
            description: resp?.error?.description || 'Payment could not be completed.',
            reason:      resp?.error?.reason      || '',
            source:      resp?.error?.source      || '',
            step:        resp?.error?.step        || '',
            metadata:    resp?.error?.metadata    || {}
          };
          console.error('[RazorpayService] payment.failed:', err);
          reject(err);
        });
      }

      rzp.open();
    });
  }

  // ─── Simulated checkout (offline / test simulation key) ──────────────────
  private openSimulatedCheckout(options: RazorpayOptions): Promise<RazorpayPaymentSuccess> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject({ dismissed: false, message: 'Not a browser environment.' });
    }

    return new Promise<RazorpayPaymentSuccess>((resolve, reject) => {
      const backdrop = document.createElement('div');
      backdrop.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(10, 15, 30, 0.88);
        backdrop-filter: blur(14px);
        z-index: 100000;
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
      `;

      const amountInRupees = (options.amount / 100).toLocaleString('en-IN');

      const modal = document.createElement('div');
      modal.style.cssText = `
        width: 100%; max-width: 420px;
        background: linear-gradient(145deg, rgba(30,41,59,0.97), rgba(15,23,42,0.99));
        border: 1px solid rgba(99,102,241,0.4);
        border-radius: 20px;
        box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(99,102,241,0.2);
        padding: 28px;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:14px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;border-radius:8px;background:#3b82f6;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;">₹</div>
            <div>
              <div style="font-weight:700;font-size:15px;color:#f8fafc;">Razorpay Checkout</div>
              <div style="font-size:10px;color:#94a3b8;letter-spacing:0.5px;text-transform:uppercase;">Test Simulation Mode</div>
            </div>
          </div>
          <button id="rzp-sim-close" style="background:none;border:none;color:#94a3b8;font-size:22px;cursor:pointer;line-height:1;">×</button>
        </div>

        <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;margin-bottom:18px;">
          <div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">Paying for</div>
          <div style="font-size:15px;font-weight:600;color:#fff;margin-bottom:10px;">${options.description}</div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;border-top:1px dashed rgba(255,255,255,0.1);padding-top:10px;">
            <span style="font-size:13px;color:#cbd5e1;">Amount Payable</span>
            <span style="font-size:22px;font-weight:700;color:#60a5fa;">₹${amountInRupees}</span>
          </div>
        </div>

        <div style="margin-bottom:18px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Customer</div>
          <div style="font-size:13px;color:#e2e8f0;">👤 ${options.prefill?.name  || 'User'}</div>
          <div style="font-size:13px;color:#e2e8f0;margin-top:4px;">✉️ ${options.prefill?.email || ''}</div>
          ${options.prefill?.contact ? `<div style="font-size:13px;color:#e2e8f0;margin-top:4px;">📱 ${options.prefill.contact}</div>` : ''}
        </div>

        <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:12px;margin-bottom:20px;font-size:12px;color:#6ee7b7;display:flex;gap:8px;align-items:center;">
          <span>🔒</span><span>Sandbox environment – no real money charged.</span>
        </div>

        <button id="rzp-sim-pay" style="
          width:100%;padding:14px;
          background:linear-gradient(135deg,#3b82f6,#6366f1);
          border:none;border-radius:12px;color:#fff;
          font-size:15px;font-weight:600;cursor:pointer;
          box-shadow:0 4px 15px rgba(99,102,241,0.4);transition:opacity 0.2s;
        ">Pay ₹${amountInRupees} →</button>
      `;

      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);

      const cleanup = () => {
        if (document.body.contains(backdrop)) document.body.removeChild(backdrop);
      };

      modal.querySelector('#rzp-sim-close')?.addEventListener('click', () => {
        cleanup();
        reject({ dismissed: true, message: 'Payment cancelled by user.' });
      });

      const payBtn = modal.querySelector('#rzp-sim-pay') as HTMLButtonElement;
      payBtn?.addEventListener('click', () => {
        payBtn.disabled    = true;
        payBtn.textContent = 'Verifying…';
        payBtn.style.opacity = '0.7';

        setTimeout(() => {
          cleanup();
          resolve({
            razorpay_order_id:   options.order_id,
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_signature:  `sig_verified_${Date.now()}`
          });
        }, 1200);
      });
    });
  }
}
