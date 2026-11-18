// Когда проверку администратора нужно пройти заново.
//
// Отметка «проверено» относится к конкретным данным: к сертификатам и
// регистрационному номеру партии, к названию и ИНН продавца. Раньше она
// оставалась после их замены — продавец проходил проверку с одними
// документами и затем подменял их на любые другие.

const norm = (v: unknown) => String(v ?? '').trim();

// Сертификаты или регистрационный номер предложения поменялись.
export function offerDocsChanged(
  prev: { certificates?: string[] | null; regNumber?: string | null },
  next: { certificates?: string[] | null; regNumber?: string | null },
): boolean {
  if (next.certificates !== undefined) {
    const a = [...(prev.certificates ?? [])].sort().join('\n');
    const b = [...(next.certificates ?? [])].sort().join('\n');
    if (a !== b) return true;
  }
  return next.regNumber !== undefined && norm(next.regNumber) !== norm(prev.regNumber);
}

// Название компании или ИНН продавца поменялись.
export function sellerIdentityChanged(
  prev: { company?: string | null; inn?: string | null },
  next: { company?: string | null; inn?: string | null },
): boolean {
  return (
    (next.company !== undefined && norm(next.company) !== norm(prev.company)) ||
    (next.inn !== undefined && norm(next.inn) !== norm(prev.inn))
  );
}
