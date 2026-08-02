"use client";
import React from 'react';
import { SimulationInput, InvestorProfile, InvestmentGoal } from '@/domain/types';
import { BcbRatesData } from '@/lib/engine/bcbService';
import { DollarSign, Calendar, TrendingUp, ShieldAlert, Target, Percent, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  input: SimulationInput;
  onChange: (updated: SimulationInput) => void;
  bcbData: BcbRatesData | null;
  loadingBcb: boolean;
  onRefreshBcb: () => void;
}

export const InputForm: React.FC<Props> = ({
  input,
  onChange,
  bcbData,
  loadingBcb,
  onRefreshBcb,
}) => {
  const handleNumberChange = (field: keyof SimulationInput, value: number) => {
    onChange({ ...input, [field]: value });
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-cyan-500/10 p-2.5 rounded-xl text-[var(--accent-cyan)]">
            <TrendingUp size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Parâmetros de Simulação
            </h2>
            <p className="text-xs text-slate-400">
              Taxas Selic e IPCA integradas com as APIs do Banco Central (SGS e Boletim Focus)
            </p>
          </div>
        </div>

        {/* Status BCB + Botão de Sincronização */}
        <div className="flex items-center gap-2.5">
          {bcbData?.source === 'BCB_LIVE' ? (
            <span className="badge badge-emerald flex items-center gap-1">
              <CheckCircle2 size={14} /> BCB Focus / SGS Ao Vivo
            </span>
          ) : (
            <span className="badge badge-amber flex items-center gap-1">
              <AlertCircle size={14} /> Taxas Padrão / Manual
            </span>
          )}

          <button
            onClick={onRefreshBcb}
            disabled={loadingBcb}
            className="bg-cyan-500/15 text-[var(--accent-cyan)] border border-cyan-500/30 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-cyan-500/25 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loadingBcb ? 'spin' : ''} />
            {loadingBcb ? 'Buscando BCB...' : 'Atualizar via BCB'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Capital Inicial */}
        <div>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
            <DollarSign size={16} className="text-[var(--accent-cyan)]" />
            Capital Inicial (R$)
          </label>
          <input
            type="number"
            value={input.initialCapital}
            onChange={(e) => handleNumberChange('initialCapital', Math.max(0, Number(e.target.value)))}
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-white font-mono font-semibold text-base outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Aporte Mensal */}
        <div>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
            <DollarSign size={16} className="text-[var(--accent-emerald)]" />
            Aporte Mensal (R$)
          </label>
          <input
            type="number"
            value={input.monthlyDeposit}
            onChange={(e) => handleNumberChange('monthlyDeposit', Math.max(0, Number(e.target.value)))}
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-white font-mono font-semibold text-base outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Horizonte de Tempo */}
        <div>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
            <Calendar size={16} className="text-[var(--accent-purple)]" />
            Prazo ({Math.round(input.months / 12 * 10) / 10} anos / {input.months} meses)
          </label>
          <input
            type="range"
            min={1}
            max={360}
            step={1}
            value={input.months}
            onChange={(e) => handleNumberChange('months', Number(e.target.value))}
            className="w-full accent-[var(--accent-purple)] cursor-pointer mt-2"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>1 mês</span>
            <span>10 anos</span>
            <span>30 anos</span>
          </div>
        </div>

        {/* Taxa Selic */}
        <div>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
            <Percent size={16} className="text-[var(--accent-amber)]" />
            Taxa Selic (% a.a. oficial BCB)
          </label>
          <input
            type="number"
            step="0.10"
            value={(input.selicRateYearly * 100).toFixed(2)}
            onChange={(e) => handleNumberChange('selicRateYearly', Number(e.target.value) / 100)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-white font-mono font-semibold text-base outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* IPCA (Inflação Focus) */}
        <div>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
            <Percent size={16} className="text-[var(--accent-rose)]" />
            IPCA Estimado (% a.a. Focus)
          </label>
          <input
            type="number"
            step="0.10"
            value={(input.ipcaRateYearly * 100).toFixed(2)}
            onChange={(e) => handleNumberChange('ipcaRateYearly', Number(e.target.value) / 100)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-white font-mono font-semibold text-base outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        {/* Perfil de Investidor */}
        <div>
          <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
            <ShieldAlert size={16} className="text-[var(--accent-cyan)]" />
            Perfil de Investidor
          </label>
          <select
            value={input.investorProfile}
            onChange={(e) => onChange({ ...input, investorProfile: e.target.value as InvestorProfile })}
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-white font-semibold text-sm outline-none focus:border-cyan-500 transition-colors cursor-pointer"
          >
            <option value="CONSERVADOR">Conservador (Baixa Volatilidade)</option>
            <option value="MODERADO">Moderado (Equilibrado)</option>
            <option value="ARROJADO">Arrojado (Busca Ganho Real Elevado)</option>
          </select>
        </div>

        {/* Objetivo do Investimento */}
        <div className="sm:col-span-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
            <Target size={16} className="text-[var(--accent-amber)]" />
            Objetivo Principal
          </label>
          <select
            value={input.investmentGoal}
            onChange={(e) => onChange({ ...input, investmentGoal: e.target.value as InvestmentGoal })}
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-white font-semibold text-sm outline-none focus:border-amber-500 transition-colors cursor-pointer"
          >
            <option value="RESERVA_EMERGENCIA">Reserva de Emergência (Liquidez D+0)</option>
            <option value="RENDA_PASSIVA">Geração de Renda Mensal (Ativo Natural)</option>
            <option value="ACUMULACAO_APOSENTADORIA">Acumulação & Aposentadoria (Longo Prazo)</option>
          </select>
        </div>

        {/* % do CDI Personalizado */}
        <div className="sm:col-span-4 bg-slate-900/80 p-4 rounded-xl border border-cyan-500/25">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <label className="flex items-center gap-2 text-sm text-cyan-400 font-bold">
              <Percent size={18} className="text-cyan-400" />
              Calculadora de Ativo com % do CDI Personalizado
            </label>
            <span className="text-xs font-mono font-bold text-white bg-cyan-500/20 px-3 py-1 rounded-lg border border-cyan-500/40">
              Rentabilidade: {(input.customCdiPercent || 110)}% do CDI ({((input.selicRateYearly - 0.001) * ((input.customCdiPercent || 110) / 100) * 100).toFixed(2)}% a.a. Bruto)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Porcentagem:</span>
              <input
                type="number"
                step="1"
                min="50"
                max="300"
                value={input.customCdiPercent || 110}
                onChange={(e) => handleNumberChange('customCdiPercent', Math.max(1, Number(e.target.value)))}
                className="w-28 px-3.5 py-1.5 rounded-lg bg-slate-950 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-sm outline-none focus:border-cyan-400"
              />
              <span className="text-xs text-slate-400 font-bold">% do CDI</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[80, 100, 110, 120, 130, 140, 150, 200].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleNumberChange('customCdiPercent', pct)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    (input.customCdiPercent || 110) === pct
                      ? 'bg-cyan-400 text-slate-950 font-black shadow-lg shadow-cyan-500/30 scale-105'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
