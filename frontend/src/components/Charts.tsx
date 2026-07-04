'use client';

import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { formatMoney } from '@/lib/utils';

const TEAL = '#0D9488';
const PIE_COLORS = ['#0D9488', '#10B981', '#F97316', '#6366F1', '#14B8A6', '#F59E0B', '#8B5CF6'];
const AXIS = '#94A3B8';
const GRID = 'rgba(148,163,184,0.18)';

const kfmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

function ChartCard({ title, children, empty }: { title: string; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="card p-5">
      <div className="mb-3 font-semibold">{title}</div>
      {empty ? (
        <div className="grid h-[220px] place-items-center text-sm text-ink-subtle">Пока нет данных</div>
      ) : (
        <div style={{ width: '100%', height: 220 }}>{children}</div>
      )}
    </div>
  );
}

const tip = {
  contentStyle: { background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)' },
  labelStyle: { color: 'var(--ink-muted)' },
};

export function SpendArea({ data }: { data: { month: string; value: number }[] }) {
  return (
    <ChartCard title="Траты по месяцам" empty={!data?.length}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
              <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={kfmt} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} width={40} />
          <Tooltip formatter={(v: any) => formatMoney(Number(v))} {...tip} />
          <Area type="monotone" dataKey="value" stroke={TEAL} strokeWidth={2} fill="url(#spend)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ChartCard title="Доли категорий" empty={!data?.length}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: any, n: any) => [formatMoney(Number(v)), n]} {...tip} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function WeeklyBars({ data, title = 'Заказы по неделям' }: { data: { week: string; count: number }[]; title?: string }) {
  return (
    <ChartCard title={title} empty={!data?.length}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} width={30} />
          <Tooltip {...tip} />
          <Bar dataKey="count" fill={TEAL} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TopProductsBar({ data }: { data: { name: string; revenue: number }[] }) {
  const rows = (data ?? []).map((d) => ({ name: d.name.length > 18 ? d.name.slice(0, 18) + '…' : d.name, revenue: d.revenue }));
  return (
    <ChartCard title="Топ товаров по обороту" empty={!rows.length}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
          <XAxis type="number" tickFormatter={kfmt} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v: any) => formatMoney(Number(v))} {...tip} />
          <Bar dataKey="revenue" fill="#10B981" radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
