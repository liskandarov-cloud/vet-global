// E-IMZO (ЭЦП) client helper.
//
// Real integration: load E-IMZO's `e-imzo.min.js`, which exposes `CAPIWS`
// (a WebSocket bridge to the local E-IMZO app on wss://127.0.0.1:64443).
// Flow: list certificates → load key → createPkcs7(id, data) → PKCS#7.
// That plugin is unavailable in this demo environment, so we fall back to a
// mock signature. Replace `mockSign` with the real CAPIWS calls when wiring
// the plugin (see https://e-imzo.uz for the SDK).

export async function signWithEimzo(documentBase64: string): Promise<string> {
  const w = window as any;

  // Real plugin present? (TODO: implement the CAPIWS certificate + sign flow.)
  if (w.CAPIWS || w.EIMZOClient) {
    // TODO(eimzo-live): certificates → loadKey → createPkcs7(keyId, documentBase64)
    // For now, fall through to mock so the flow stays testable.
  }

  return mockSign(documentBase64);
}

// Deterministic stand-in PKCS#7 for the mock flow.
function mockSign(documentBase64: string): string {
  const payload = `MOCK-EIMZO-PKCS7::${documentBase64.slice(0, 24)}`;
  return typeof btoa !== 'undefined' ? btoa(payload) : payload;
}
