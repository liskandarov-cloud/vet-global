import { api } from './api';

// Документ продавца (лицензия) открывается через API с входом: по общей
// ссылке закрытые файлы не отдаются. Вкладка открывается сразу по нажатию —
// иначе браузер счёл бы её всплывающим окном после ожидания ответа.
export async function openSellerDocument(doc: { id: string; fileUrl: string }) {
  const tab = window.open('', '_blank');
  try {
    const { data } = await api.get(`/seller-documents/${doc.id}/file`, { responseType: 'blob' });
    const url = URL.createObjectURL(data as Blob);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch {
    // S3 на локальном стенде отвечает перенаправлением на бакет — открываем его напрямую.
    if (tab) tab.location.href = doc.fileUrl;
  }
}
