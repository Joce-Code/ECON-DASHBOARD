"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { SimulationInput } from '@/domain/types';
import { ASSET_PRESETS } from '@/lib/engine/assetsPreset';
import { runSimulation } from '@/lib/engine/simulationEngine';
import { generateSWOTForAsset } from '@/lib/analysis/swotEngine';
import { evaluateTradeoff } from '@/lib/analysis/tradeoffEngine';
import { getBcbLiveRates, BcbRatesData } from '@/lib/engine/bcbService';

import { InputForm } from './InputForm';
import { KPIOverview } from './KPIOverview';
import { EvolutionChart } from './EvolutionChart';
import { TradeoffReport } from './TradeoffReport';
import { SWOTMatrixCard } from './SWOTMatrixCard';

import { Cpu, PieChart, Layers } from 'lucide-react';

export default function RealProfitSimulator() {
  const [input, setInput] = useState<SimulationInput>({
    initialCapital: 50000,
    monthlyDeposit: 1500,
    months: 60, // 5 anos
    selicRateYearly: 0.105, // Fallback inicial 10.5%
    ipcaRateYearly: 0.040,  // Fallback inicial 4.0%
    investorProfile: 'MODERADO',
    investmentGoal: 'ACUMULACAO_APOSENTADORIA',
  });

  const [selectedAssetId, setSelectedAssetId] = useState<string>('cdb-110-cdi');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BREAKDOWN'>('OVERVIEW');

  const [bcbData, setBcbData] = useState<BcbRatesData | null>(null);
  const [loadingBcb, setLoadingBcb] = useState<boolean>(false);

  // Busca inicial das taxas do Banco Central / Boletim Focus
  const fetchBcbRates = async () => {
    setLoadingBcb(true);
    try {
      const live = await getBcbLiveRates();
      setBcbData(live);
      setInput((prev) => ({
        ...prev,
        selicRateYearly: live.selicRateYearly,
        ipcaRateYearly: live.ipcaRateYearly,
      }));
    } catch (err) {
      console.error('Erro ao carregar taxas BCB:', err);
    } finally {
      setLoadingBcb(false);
    }
  };

  useEffect(() => {
    fetchBcbRates();
  }, []);

  // Executa as simulações para todos os ativos cadastrados
  const simulationResults = useMemo(() => {
    return ASSET_PRESETS.map((asset) => runSimulation(asset, input));
  }, [input]);

  // Calcula os Scores de Trade-off
  const tradeoffScores = useMemo(() => {
    return simulationResults.map((result) =>
      evaluateTradeoff(result, input.investorProfile, input.investmentGoal)
    );
  }, [simulationResults, input.investorProfile, input.investmentGoal]);

  // Ativo atualmente selecionado para detalhamento
  const selectedResult = useMemo(() => {
    return simulationResults.find((r) => r.asset.id === selectedAssetId) || simulationResults[0];
  }, [simulationResults, selectedAssetId]);

  // Análise SWOT do ativo selecionado
  const selectedSWOT = useMemo(() => {
    return generateSWOTForAsset(selectedResult.asset, input.selicRateYearly, input.ipcaRateYearly);
  }, [selectedResult, input.selicRateYearly, input.ipcaRateYearly]);

  return (
    <div className="space-y-6">
      {/* Header FinTech */}
      <header className="flex flex-wrap justify-between items-center gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5">
              <Cpu size={18} />
              <span>FINENGINE</span>
            </div>
            <span className="badge badge-cyan">Integrado ao BCB & Boletim Focus</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Simulador de Lucro Real & Trade-off de Investimentos
          </h1>
          <p className="text-xs text-slate-400">
            Cálculo de poder de compra real descontando inflação (Equação de Fisher), IR e taxas B3 com taxas em tempo real.
          </p>
        </div>

        {/* Resumo Macroeconômico BCB */}
        <div className="glass-card px-5 py-3 flex gap-5 items-center">
          <div>
            <div className="text-[11px] text-slate-500">Selic Oficial (BCB)</div>
            <div className="text-base font-bold text-amber-400 font-mono">
              {(input.selicRateYearly * 100).toFixed(2)}% a.a.
            </div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div>
            <div className="text-[11px] text-slate-500">IPCA Focus (Mediana)</div>
            <div className="text-base font-bold text-rose-400 font-mono">
              {(input.ipcaRateYearly * 100).toFixed(2)}% a.a.
            </div>
          </div>
        </div>
      </header>

      {/* Formulário de Entrada */}
      <InputForm
        input={input}
        onChange={setInput}
        bcbData={bcbData}
        loadingBcb={loadingBcb}
        onRefreshBcb={fetchBcbRates}
      />

      {/* Tabela de Trade-off (Comparativo Geral) */}
      <TradeoffReport
        results={simulationResults}
        tradeoffScores={tradeoffScores}
        selectedAssetId={selectedAssetId}
        onSelectAsset={setSelectedAssetId}
      />

      {/* Navegação entre Visualização Geral e Tabela Mês a Mês */}
      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'OVERVIEW'
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-lg shadow-cyan-500/20'
              : 'bg-slate-800/50 text-white hover:bg-slate-800'
          }`}
        >
          <PieChart size={18} />
          Visão Geral & Matriz FOFA
        </button>

        <button
          onClick={() => setActiveTab('BREAKDOWN')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'BREAKDOWN'
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-lg shadow-cyan-500/20'
              : 'bg-slate-800/50 text-white hover:bg-slate-800'
          }`}
        >
          <Layers size={18} />
          Detalhamento Mês a Mês ({selectedResult.asset.name})
        </button>
      </div>

      {activeTab === 'OVERVIEW' ? (
        <div className="animate-fade-in">
          {/* Overview de KPIs do Ativo Selecionado */}
          <KPIOverview result={selectedResult} />

          {/* Gráfico de Evolução Patrimonial Real */}
          <EvolutionChart result={selectedResult} />

          {/* Matriz FOFA / SWOT */}
          <SWOTMatrixCard asset={selectedResult.asset} swot={selectedSWOT} />
        </div>
      ) : (
        <div className="glass-card p-6 animate-fade-in">
          <h2 className="text-lg font-bold text-white mb-4">
            Fluxo Evolutivo Mês a Mês: {selectedResult.asset.name}
          </h2>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0f172a] border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Mês</th>
                  <th className="py-2.5 px-3">Aportes Acumulados</th>
                  <th className="py-2.5 px-3">Montante Bruto</th>
                  <th className="py-2.5 px-3">IR Estimado</th>
                  <th className="py-2.5 px-3">Taxa B3</th>
                  <th className="py-2.5 px-3">Montante Líquido</th>
                  <th className="py-2.5 px-3">Patrimônio Real (IPCA)</th>
                  <th className="py-2.5 px-3">Lucro Real Acum.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {selectedResult.monthlyBreakdown.map((row) => (
                  <tr key={row.month} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-400 font-sans">Mês {row.month}</td>
                    <td className="py-2.5 px-3 text-slate-300">R$ {row.contributionsAccumulated.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 text-white">R$ {row.grossAmount.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 text-rose-400">R$ {row.estimatedTaxAmount.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 text-amber-400">R$ {row.b3CustodyFeeAccumulated.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-semibold">R$ {row.netAmountNominal.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 text-[var(--accent-cyan)] font-bold">R$ {row.netAmountReal.toLocaleString('pt-BR')}</td>
                    <td className={`py-2.5 px-3 ${row.realProfitAccumulated >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      R$ {row.realProfitAccumulated.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer FinTech */}
      <footer className="pt-5 border-t border-slate-800 text-center text-xs text-slate-500 space-y-1">
        <p>Simulador de Lucro Real e Trade-off de Investimentos • Dados ao vivo via APIs Oficiais do Banco Central do Brasil (SGS e Focus OData)</p>
        <p>Cálculos tributários baseados nas alíquotas oficiais vigentes de IR de Renda Fixa, Ações, FIIs e custódia B3.</p>
      </footer>
    </div>
  );
}
