// Didox e-invoicing (ЭДО) contracts. Kept provider-agnostic so the mock and the
// real HTTP adapter are interchangeable.

export type DidoxStatus = 'DRAFT' | 'SENT' | 'SIGNED' | 'REJECTED';

export interface FacturaParty {
  tin?: string | null; // ИНН/СТИР
  name?: string | null;
}

export interface FacturaItem {
  name: string;
  // Код ИКПУ и код упаковки — обязательны в ЭСФ; у строки доставки их нет,
  // пока площадка не выбрала код услуги.
  catalogCode?: string | null;
  packageCode?: string | null;
  quantity: number;
  price: number;
  total: number;
}

// Normalised invoice payload we hand to an adapter; the LiveAdapter maps this
// onto Didox's actual JSON (facturano/facturadate/...).
export interface FacturaPayload {
  facturaNo: string;
  facturaDate: string; // ISO date
  seller: FacturaParty;
  buyer: FacturaParty;
  items: FacturaItem[];
  total: number;
}

export interface DidoxResult {
  didoxId: string;
  status: DidoxStatus;
}

export interface DidoxAdapter {
  readonly mode: 'mock' | 'live';
  createInvoice(payload: FacturaPayload): Promise<DidoxResult>;
  getStatus(didoxId: string): Promise<DidoxStatus>;
}
