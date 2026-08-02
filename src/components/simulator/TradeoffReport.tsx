"use client";
import React from 'react';
import { SimulationResult, TradeoffScore } from '@/domain/types';
import { Award, CheckCircle, AlertTriangle, XCircle, ChevronRight, Zap } from 'lucide-react';

interface Props {
  results: SimulationResult[];
  tradeoffScores: TradeoffScore[];
  selectedAssetId: string;
  onSelectAsset: (assetId: string) => void;
}

export const TradeoffReport: React.FC<Props> = ({
  results,
  tradeoffScores,
  selectedAssetId,
  onSelectAsset,
}) => {
  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getBadgeClass = (badge: TradeoffScore['suitabilityBadge']) => {
    switch (badge) {
      case 'ALTAMENTE_RECOMENDADO':
        return 'badge-emerald';
      case 'ADEQUADO':
        return 'badge-cyan';
      case 'ATENCAO':
        return 'badge-amber';
      case 'NAO_RECOMENDADO':
        return 'badge-rose';
    }
  };

  const getBadgeIcon = (badge: TradeoffScore['suitabilityBadge']) => {
    switch (badge) {
      case 'ALTAMENTE_RECOMENDADO':
        return <CheckCircle size={14} />;
      case 'ADEQUADO':
        return <Award size={14} />;
      case 'ATENCAO':
        return <AlertTriangle size={14} />;
      case 'NAO_RECOMENDADO':
        return <XCircle size={14} />;
    }
  };

  return (
    <div className="glass-card p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-400">
            <Zap size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Matriz Comparativa de Trade-off (Risco x Liquidez x Retorno Real)
            </h2>
            <p className="text-xs text-slate-400">
              Selecione uma opção para detalhar os KPIs e a Matriz FOFA / SWOT
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-medium">
              <th className="py-3 px-3.5">Ativo</th>
              <th className="py-3 px-3.5">Montante Bruto</th>
              <th className="py-3 px-3.5">IR Efetivo</th>
              <th className="py-3 px-3.5">Patrimônio Real</th>
              <th className="py-3 px-3.5">Taxa Real a.a.</th>
              <th className="py-3 px-3.5">Ativo Natural (/mês)</th>
              <th className="py-3 px-3.5">Adequação ao Perfil</th>
              <th className="py-3 px-3.5 text-center">Ação</th>
            </tr>
          </thead>
          <tbody>
            {results.map((res) => {
              const tradeoff = tradeoffScores.find((t) => t.assetId === res.asset.id);
              const isSelected = res.asset.id === selectedAssetId;

              return (
                <tr
                  key={res.asset.id}
                  onClick={() => onSelectAsset(res.asset.id)}
                  className={`border-b border-white/5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-cyan-500/10' : 'hover:bg-white/5'
                  }`}
                >
                  <td className="py-4 px-3.5">
                    <div className="font-bold text-white">{res.asset.name}</div>
                    <div className="text-[11px] text-slate-500">
                      Liquidez D+{res.asset.liquidityDays} {res.asset.fgcProtection ? '• Com FGC' : ''}
                    </div>
                  </td>

                  <td className="py-4 px-3.5 text-slate-300 font-mono">
                    {formatBRL(res.finalGrossAmount)}
                  </td>

                  <td className="py-4 px-3.5 font-mono">
                    <span className={res.effectiveTaxRatePercent === 0 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                      {res.effectiveTaxRatePercent === 0 ? 'ISENTO' : `${res.effectiveTaxRatePercent.toFixed(1)}%`}
                    </span>
                  </td>

                  <td className="py-4 px-3.5 font-bold text-[var(--accent-cyan)] font-mono">
                    {formatBRL(res.finalNetAmountReal)}
                  </td>

                  <td className={`py-4 px-3.5 font-semibold font-mono ${res.realYieldAnnualizedPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {res.realYieldAnnualizedPercent >= 0 ? '+' : ''}{res.realYieldAnnualizedPercent.toFixed(2)}%
                  </td>

                  <td className="py-4 px-3.5 font-semibold text-emerald-400 font-mono">
                    {formatBRL(res.sustainableMonthlyCashFlowReal)}
                  </td>

                  <td className="py-4 px-3.5">
                    {tradeoff && (
                      <span className={`badge ${getBadgeClass(tradeoff.suitabilityBadge)}`}>
                        {getBadgeIcon(tradeoff.suitabilityBadge)}
                        {tradeoff.suitabilityBadge.replace('_', ' ')} ({tradeoff.suitabilityScore} pts)
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-3.5 text-center">
                    <button
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors ${
                        isSelected ? 'bg-[var(--accent-cyan)] text-black' : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {isSelected ? 'Selecionado' : 'Analisar'}
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
