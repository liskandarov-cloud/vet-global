'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { LEGAL_DOCS, LEGAL_VERSION, type LegalDocKey } from '@/lib/legal';
import { LEGAL_SECTIONS_UZ } from '@/lib/legal-uz';

const KEYS = Object.keys(LEGAL_DOCS) as LegalDocKey[];

// Места, которые должен заполнить юрист, подсвечиваются — чтобы проект
// документа нельзя было по ошибке принять за окончательную редакцию.
function withPlaceholders(text: string) {
  return text.split(/(\[[^\]]+\])/g).map((part, i) =>
    part.startsWith('[') && part.endsWith(']') ? (
      <mark key={i} className="rounded bg-amber-100 px-1 text-amber-900">{part}</mark>
    ) : (
      part
    ),
  );
}

// Документ на языке интерфейса. Сервер отдаёт русскую редакцию (её и видят
// поисковики), узбекская подставляется, если пользователь выбрал oʻzbekcha.
export function LegalView({ doc }: { doc: LegalDocKey }) {
  const { lang, tt } = useI18n();
  const d = LEGAL_DOCS[doc];
  const sections = lang === 'uz' ? LEGAL_SECTIONS_UZ[doc] : d.sections;
  // Версия — дата и, если в тот же день правок было несколько, номер: «2026-11-18.2».
  const [y, m, dd] = LEGAL_VERSION.slice(0, 10).split('-');

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <nav className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {KEYS.map((k) => (
          <Link
            key={k}
            href={`/legal/${k}`}
            className={k === doc ? 'font-semibold text-teal-700' : 'text-ink-muted hover:text-teal-700'}
          >
            {tt(LEGAL_DOCS[k].title, LEGAL_DOCS[k].titleUz)}
          </Link>
        ))}
      </nav>
      <h1 className="font-heading text-3xl font-extrabold">{tt(d.title, d.titleUz)}</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {tt(`Редакция от ${dd}.${m}.${y}`, `${dd}.${m}.${y} dagi tahrir`)}
        {lang === 'uz' && ' · Matnlar oʻrtasida tafovut boʻlsa, rus tilidagi matn ustun turadi.'}
      </p>
      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-heading text-lg font-bold">{s.h}</h2>
            <div className="mt-3 space-y-3 leading-relaxed text-ink">
              {s.p.map((p, i) => (
                <p key={i}>{withPlaceholders(p)}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
