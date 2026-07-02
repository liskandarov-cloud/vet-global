import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(n: number, locale = 'ru-RU') {
  return `${Math.round(n).toLocaleString(locale)} сум`;
}
