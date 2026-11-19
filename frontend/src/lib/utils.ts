import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Язык валюты задаёт I18nProvider: в узбекском интерфейсе «сум» кириллицей
// выглядел непереведённым на каждой цене сайта.
let moneyLang: 'ru' | 'uz' = 'ru';
export function setMoneyLang(lang: 'ru' | 'uz') {
  moneyLang = lang;
}

export function formatMoney(n: number, locale = 'ru-RU') {
  return `${Math.round(n).toLocaleString(locale)} ${moneyLang === 'uz' ? 'soʻm' : 'сум'}`;
}
