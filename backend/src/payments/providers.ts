import { PaymentProvider } from '@prisma/client';

export interface CheckoutContext {
  paymentId: string;
  orderId: string;
  amountSum: number; // в сумах
  returnUrl: string;
  config: {
    clickServiceId?: string;
    clickMerchantId?: string;
    paymeMerchantId?: string;
    uzumMerchantId?: string;
  };
}

// Builds a real provider checkout URL. Creating the redirect link needs only
// public merchant identifiers; confirming the payment (webhooks) needs secret
// keys and is handled separately (see PaymentsController webhooks — TODO live).
export function buildCheckoutUrl(provider: PaymentProvider, ctx: CheckoutContext): string {
  switch (provider) {
    case 'CLICK': {
      const p = new URLSearchParams({
        service_id: ctx.config.clickServiceId ?? '',
        merchant_id: ctx.config.clickMerchantId ?? '',
        amount: String(ctx.amountSum),
        transaction_param: ctx.paymentId,
        return_url: ctx.returnUrl,
      });
      return `https://my.click.uz/services/pay?${p.toString()}`;
    }
    case 'PAYME': {
      // Payme checkout uses a base64 of `m=merchant;ac.order_id=..;a=amount_in_tiyin`.
      const tiyin = Math.round(ctx.amountSum * 100);
      const raw = `m=${ctx.config.paymeMerchantId ?? ''};ac.order_id=${ctx.orderId};a=${tiyin};c=${ctx.returnUrl}`;
      const encoded = Buffer.from(raw).toString('base64');
      return `https://checkout.paycom.uz/${encoded}`;
    }
    case 'UZUM': {
      // TODO(uzum-live): confirm UZUM Bank checkout URL scheme + merchant params.
      const p = new URLSearchParams({
        merchant_id: ctx.config.uzumMerchantId ?? '',
        amount: String(ctx.amountSum),
        order_id: ctx.orderId,
        return_url: ctx.returnUrl,
      });
      return `https://www.uzumbank.uz/checkout?${p.toString()}`;
    }
    default:
      return ctx.returnUrl;
  }
}
