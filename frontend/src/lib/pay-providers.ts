'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

export const PROVIDER_LABEL: Record<string, string> = { CLICK: 'Click', PAYME: 'Payme', UZUM: 'UZUM' };

// Способы оплаты, которые сервер действительно принимает: в live — только те,
// чьи ключи подключены. null — ещё загружается.
export function usePayProviders(): string[] | null {
  const [list, setList] = useState<string[] | null>(null);
  useEffect(() => {
    api
      .get('/payments/providers')
      .then(({ data }) => setList(data.providers ?? []))
      .catch(() => setList([]));
  }, []);
  return list;
}
