import { Logger } from '@nestjs/common';
import { DidoxAdapter, DidoxResult, DidoxStatus, FacturaPayload } from '../didox.types';

interface LiveConfig {
  baseUrl: string; // e.g. https://testapi3.didox.uz or https://api-partners.didox.uz
  token?: string; // partner token (issued by Didox account manager)
}

// Real Didox HTTP adapter — SKELETON. The endpoint paths and JSON field names are
// per the public docs (https://api-docs.didox.uz, /v2/documents) but the exact
// request body must be confirmed against the partner docs before going live.
// TODO(didox-live): fill payload mapping + status code map once creds/spec обеспечены.
export class LiveDidoxAdapter implements DidoxAdapter {
  readonly mode = 'live' as const;
  private readonly logger = new Logger('DidoxLive');

  constructor(private readonly cfg: LiveConfig) {}

  private headers() {
    if (!this.cfg.token) throw new Error('DIDOX_TOKEN is not set (partner token required for live mode)');
    return { 'Content-Type': 'application/json', Authorization: this.cfg.token };
  }

  // Maps our normalised payload onto Didox factura JSON. Field names per docs.
  private toDidoxBody(p: FacturaPayload) {
    return {
      facturano: p.facturaNo,
      facturadate: p.facturaDate,
      seller: { tin: p.seller.tin, name: p.seller.name },
      buyer: { tin: p.buyer.tin, name: p.buyer.name },
      productlist: {
        products: p.items.map((it, i) => ({
          ordno: i + 1,
          name: it.name,
          count: it.quantity,
          summa: it.price,
          deliverysum: it.total,
        })),
      },
      totalsum: p.total,
    };
  }

  async createInvoice(payload: FacturaPayload): Promise<DidoxResult> {
    const res = await fetch(`${this.cfg.baseUrl}/v2/documents`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(this.toDidoxBody(payload)),
    });
    if (!res.ok) throw new Error(`Didox createInvoice failed: ${res.status} ${await res.text()}`);
    const data: any = await res.json();
    // TODO(didox-live): confirm response shape (doc id + status field).
    return { didoxId: String(data.id ?? data.documentId ?? ''), status: this.mapStatus(data.status) };
  }

  async getStatus(didoxId: string): Promise<DidoxStatus> {
    const res = await fetch(`${this.cfg.baseUrl}/v2/documents/${encodeURIComponent(didoxId)}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Didox getStatus failed: ${res.status}`);
    const data: any = await res.json();
    return this.mapStatus(data.status);
  }

  // TODO(didox-live): replace with the real numeric/string status codes from the docs.
  private mapStatus(raw: unknown): DidoxStatus {
    switch (String(raw)) {
      case '0': return 'DRAFT';
      case '1': return 'SENT';
      case '2': return 'SIGNED';
      case '3': return 'REJECTED';
      default: return 'SENT';
    }
  }
}
