import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalView } from '@/components/LegalView';
import { LEGAL_DOCS, type LegalDocKey } from '@/lib/legal';

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

export default async function LegalPage(props: { params: Promise<{ doc: string }> }) {
  const { doc } = await props.params;
  if (!LEGAL_DOCS[doc as LegalDocKey]) notFound();
  return <LegalView doc={doc as LegalDocKey} />;
}
