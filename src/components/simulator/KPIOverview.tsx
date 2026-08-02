"use client";
import React from 'react';
import { SimulationResult } from '@/domain/types';
import { ShieldCheck, TrendingUp, Wallet, Award } from 'lucide-react';

interface Props {
  result: SimulationResult;
}

export const KPIOverview: React.FC<Props> = ({ result }) => {
  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Montante Líquido Real (Destaque Principal) */}
      <div className="glass-card p-5 bg-gradient-to-br from-cyan-500/10 to-slate-900/80 border-cyan-500/30">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-[var(--accent-cyan)] font-semibold uppercase tracking-wider">
            Patrimônio Real (IPCA Descontado)
          </span>
          <div className="bg-cyan-500/20 p-2 rounded-xl text-[var(--accent-cyan)]">
            <ShieldCheck size={20} />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-white tracking-tight font-mono">
          {formatBRL(result.finalNetAmountReal)}
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Total Aportado: <strong className="text-white font-mono">{formatBRL(result.totalContributed)}</strong>
        </div>
      </div>

      {/* Renda Mensal Sustentável ("Ativo Natural") */}
      <div className="glass-card p-5 bg-gradient-to-br from-emerald-500/10 to-slate-900/80 border-emerald-500/30">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
            Fluxo de Caixa "Ativo Natural"
          </span>
          <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
            <Wallet size={20} />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-emerald-400 tracking-tight font-mono">
          {formatBRL(result.sustainableMonthlyCashFlowReal)} <span className="text-sm font-sans font-normal text-slate-400">/mês</span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Retirada real sustentável sem consumir capital.
        </div>
      </div>

      {/* Lucro Real vs Inflação */}
      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Rentabilidade Real Total
          </span>
          <div className="bg-amber-500/15 p-2 rounded-xl text-amber-400">
            <TrendingUp size={20} />
          </div>
        </div>
        <div className={`text-2xl font-extrabold font-mono ${result.realYieldTotalPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {result.realYieldTotalPercent >= 0 ? '+' : ''}{result.realYieldTotalPercent.toFixed(2)}%
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Taxa Real Anualizada: <strong className="text-white font-mono">{result.realYieldAnnualizedPercent.toFixed(2)}% a.a.</strong>
        </div>
      </div>

      {/* Eficiência Tributária & Desconto IR */}
      <div className="glass-card p-5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Imposto de Renda Pago
          </span>
          <div className="bg-purple-500/15 p-2 rounded-xl text-purple-400">
            <Award size={20} />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-white font-mono">
          {formatBRL(result.totalIncomeTaxPaid)}
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Alíquota Efetiva sobre Rendimento: <strong className="text-[var(--accent-cyan)] font-mono">{result.effectiveTaxRatePercent.toFixed(1)}%</strong>
        </div>
      </div>
    </div>
  );
};
