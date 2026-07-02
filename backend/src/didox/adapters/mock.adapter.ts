import { Logger } from '@nestjs/common';
import { DidoxAdapter, DidoxResult, DidoxStatus, FacturaPayload } from '../didox.types';

// Deterministic mock: create → SENT, then getStatus → SIGNED (simulates the
// counterparty signing via E-imzo). Lets the whole ЭДО flow be demoed with no creds.
export class MockDidoxAdapter implements DidoxAdapter {
  readonly mode = 'mock' as const;
  private readonly logger = new Logger('DidoxMock');

  async createInvoice(payload: FacturaPayload): Promise<DidoxResult> {
    const didoxId = `MOCK-${payload.facturaNo}`;
    this.logger.log(`(mock) createInvoice ${payload.facturaNo} → ${didoxId} [SENT]`);
    return { didoxId, status: 'SENT' };
  }

  async getStatus(didoxId: string): Promise<DidoxStatus> {
    // Simulate that the buyer has signed the received document.
    this.logger.log(`(mock) getStatus ${didoxId} → SIGNED`);
    return 'SIGNED';
  }
}
