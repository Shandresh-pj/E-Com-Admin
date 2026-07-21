export const environment = {
  production: true,
  // ─── Backend API ───────────────────────────────────────────────────────────
  // Set this to your Render backend URL. Must NOT have a trailing slash.
  apiUrl: 'https://new-e-commerce-backend-xt4w.onrender.com/api',
  socketUrl: 'https://new-e-commerce-backend-xt4w.onrender.com',
  appName: 'SVK E-Commerce',
  // ─── AI ──────────────────────────────────────────────────────────────────
  geminiApiKey: '', // Set in deployment — never commit to Git
  // ─── Razorpay ─────────────────────────────────────────────────────────────
  // ⚠️  CRITICAL: Use a LIVE key (rzp_live_...) in production.
  //               Test keys (rzp_test_...) will NOT process real payments.
  //               Replace this with the live key from your Razorpay Dashboard.
  razorpayKeyId: 'rzp_test_TE4sr2G8bmm7c3' // ← REPLACE WITH rzp_live_... for production
};