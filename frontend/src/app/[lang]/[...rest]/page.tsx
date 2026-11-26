import { notFound } from 'next/navigation';

// Неизвестный адрес внутри языковой версии — страница «не найдено».
export default function CatchAll() {
  notFound();
}
