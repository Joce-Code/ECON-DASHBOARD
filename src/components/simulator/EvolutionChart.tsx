"use client";
import React from 'react';
import { SimulationResult } from '@/domain/types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';

interface Props {
  result: SimulationResult;
}

export const EvolutionChart: React.FC<Props> = ({ result }) => {
  const data = result.monthlyBreakdown.map((item) => ({
    month: `Mês ${item.month}`,
    Aportes: item.contributionsAccumulated,
    'Montante Bruto': item.grossAmount,
    'Líquido Nominal': item.netAmountNominal,
    'Patrimônio Real (IPCA)': item.netAmountReal,
  }));

  const formatBRL = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value}`;
  };

  return (
    <div className="glass-card p-6 mb-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="bg-cyan-500/10 p-2.5 rounded-xl text-[var(--accent-cyan)]">
          <LineChartIcon size={22} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">
            Evolução Patrimonial e Poder de Compra ({result.asset.name})
          </h2>
          <p className="text-xs text-slate-400">
            Comparativo entre valor bruto, resgate líquido e ajuste inflacionário (IPCA)
          </p>
        </div>
      </div>

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorContrib" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickFormatter={formatBRL} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: 'rgba(0, 242, 254, 0.3)',
                borderRadius: '12px',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
              formatter={(value: any) => [
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)),
              ]}
            />
            <Legend wrapperStyle={{ paddingTop: '15px' }} />
            <Area
              type="monotone"
              dataKey="Patrimônio Real (IPCA)"
              stroke="#00f2fe"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorReal)"
            />
            <Area
              type="monotone"
              dataKey="Líquido Nominal"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorNet)"
            />
            <Area
              type="monotone"
              dataKey="Aportes"
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#colorContrib)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
