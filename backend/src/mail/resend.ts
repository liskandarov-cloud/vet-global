// Отправка письма через HTTP API Resend — отдельно от Nest, чтобы проверять
// без поднятия модуля. Возвращает текст ошибки вместо исключения: письмо —
// побочный эффект, и его сбой не должен ронять действие, ради которого оно.

export interface ResendMessage {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

type FetchLike = (url: string, init: any) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export async function sendViaResend(
  apiKey: string,
  msg: ResendMessage,
  fetchFn: FetchLike = fetch as unknown as FetchLike,
): Promise<string | null> {
  try {
    const res = await fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return `Resend ${res.status} ${(await res.text()).slice(0, 300)}`;
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
