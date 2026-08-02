"use client";
import React from 'react';
import { AssetPreset, SWOTItem } from '@/domain/types';
import { ShieldCheck, Sparkles, AlertCircle, AlertTriangle, Grid } from 'lucide-react';

interface Props {
  asset: AssetPreset;
  swot: SWOTItem;
}

export const SWOTMatrixCard: React.FC<Props> = ({ asset, swot }) => {
  return (
    <div className="glass-card p-6 mb-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="bg-purple-500/10 p-2.5 rounded-xl text-purple-400">
          <Grid size={22} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">
            Matriz FOFA / SWOT Adaptativa: {asset.name}
          </h2>
          <p className="text-xs text-slate-400">
            Análise estratégica de adequação ao cenário macroeconômico atual
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Forças (Strengths) */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4.5">
          <div className="flex items-center gap-2 mb-3 text-emerald-400 font-bold text-sm">
            <ShieldCheck size={18} />
            <span>FORÇAS (Strengths)</span>
          </div>
          <ul className="space-y-2">
            {swot.strengths.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                <span className="text-emerald-400 font-bold">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Oportunidades (Opportunities) */}
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4.5">
          <div className="flex items-center gap-2 mb-3 text-[var(--accent-cyan)] font-bold text-sm">
            <Sparkles size={18} />
            <span>OPORTUNIDADES (Opportunities)</span>
          </div>
          <ul className="space-y-2">
            {swot.opportunities.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                <span className="text-[var(--accent-cyan)] font-bold">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Fraquezas (Weaknesses) */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4.5">
          <div className="flex items-center gap-2 mb-3 text-amber-400 font-bold text-sm">
            <AlertCircle size={18} />
            <span>FRAQUEZAS (Weaknesses)</span>
          </div>
          <ul className="space-y-2">
            {swot.weaknesses.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                <span className="text-amber-400 font-bold">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Ameaças (Threats) */}
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4.5">
          <div className="flex items-center gap-2 mb-3 text-rose-400 font-bold text-sm">
            <AlertTriangle size={18} />
            <span>AMEAÇAS (Threats)</span>
          </div>
          <ul className="space-y-2">
            {swot.threats.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                <span className="text-rose-400 font-bold">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
