import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LEGAL_DOCS, LEGAL_VERSION, type LegalDocKey } from '@/lib/legal';

const KEYS = Object.keys(LEGAL_DOCS) as LegalDocKey[];

export const dynamicParams = false;
export function generateStaticParams() {
  return KEYS.map((doc) => ({ doc }));
}

export async function generateMetadata(props: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const { doc } = await props.params;
  const d = LEGAL_DOCS[doc as LegalDocKey];
  if (!d) return {};
  return { title: d.title, alternates: { canonical: `/legal/${doc}` } };
}

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

export default async function LegalPage(props: { params: Promise<{ doc: string }> }) {
  const { doc } = await props.params;
  const d = LEGAL_DOCS[doc as LegalDocKey];
  if (!d) notFound();
  const [y, m, dd] = LEGAL_VERSION.split('-');

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <nav className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {KEYS.map((k) => (
          <Link
            key={k}
            href={`/legal/${k}`}
            className={k === doc ? 'font-semibold text-teal-700' : 'text-ink-muted hover:text-teal-700'}
          >
            {LEGAL_DOCS[k].title}
          </Link>
        ))}
      </nav>
      <h1 className="font-heading text-3xl font-extrabold">{d.title}</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Редакция от {dd}.{m}.{y} · {d.titleUz}: o‘zbek tilidagi tahriri tayyorlanmoqda.
      </p>
      <div className="mt-8 space-y-8">
        {d.sections.map((s) => (
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
