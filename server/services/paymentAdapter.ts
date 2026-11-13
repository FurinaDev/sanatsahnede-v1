import crypto from 'crypto';

export interface PaymentCheckoutResult {
  mode: 'sandbox' | 'production';
  provider: string;
  checkoutToken: string;
  providerRef: string;
  status: 'initialized' | 'succeeded';
  message: string;
}

export function getPaymentMode(): 'sandbox' | 'production' {
  const raw = (process.env.PAYMENT_MODE || 'sandbox').toLowerCase();
  if (raw === 'production' && process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY) {
    return 'production';
  }
  return 'sandbox';
}

export function initializeEscrowCheckout(input: {
  bookingId: string;
  amount: number;
  buyerEmail: string;
  buyerName: string;
}): PaymentCheckoutResult {
  const mode = getPaymentMode();
  const providerRef = `${mode === 'production' ? 'iyz_live' : 'iyz_sbx'}_${input.bookingId}_${Date.now()}`;
  const checkoutToken = crypto.randomBytes(12).toString('hex');

  if (mode === 'production') {
    // Live mode placeholder structure ready for real iyzico CheckoutFormInitialize REST call
    return {
      mode: 'production',
      provider: 'iyzico_live',
      checkoutToken,
      providerRef,
      status: 'initialized',
      message: 'Canlı iyzico ödeme oturumu başlatıldı. Webhook doğrulaması bekleniyor.',
    };
  }

  return {
    mode: 'sandbox',
    provider: 'iyzico_sandbox',
    checkoutToken,
    providerRef,
    status: 'initialized',
    message: 'iyzico Sandbox güvence ödeme oturumu başlatıldı (Test Modu — Gerçek para transferi yapılmaz).',
  };
}

export function signWebhookPayload(payload: string): string {
  const secret = process.env.IYZICO_SECRET_KEY || 'sanatsahnede_sandbox_webhook_secret';
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyWebhookSignature(payload: string, signature?: string): boolean {
  if (!signature) return false;
  const expected = signWebhookPayload(payload);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
  } catch {
    return false;
  }
}
