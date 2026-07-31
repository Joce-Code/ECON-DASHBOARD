import { getGoldKPIs, getGoldFocusMensal, getGoldFocusCopom } from "@/lib/data-pipeline/aggregators";
import { Suspense } from "react";

import TradingViewWidget from "@/components/TradingViewWidget";
import WhatIfCalculator from "@/components/WhatIfCalculator";
import RagChat from "@/components/RagChat";

export const revalidate = 3600; // ISR 1 hour

export default async function Page() {
  // SSR Data Fetching (Fronteira Eficiente)
  const [kpis, focusMensal, focusCopom] = await Promise.all([
    getGoldKPIs(),
    getGoldFocusMensal(),
    getGoldFocusCopom()
  ]);

  return (
    <div className="space-y-8">
      {/* Dobra Superior: KPIs Críticos SSR/Edge Cache */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpis.error ? (
          <div className="col-span-3 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
            ⚠ Alerta de Contingência: Falha na observabilidade dos dados do BCB. Exibindo último snapshot válido.
          </div>
        ) : (
          <>
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl">
              <p className="text-sm text-slate-400">IPCA Acumulado 12m</p>
              <h2 className="text-3xl font-mono text-white mt-2">{kpis.ipca?.valor}%</h2>
              <p className={`text-xs mt-2 font-mono ${Number(kpis.ipca?.delta) < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {Number(kpis.ipca?.delta) > 0 ? '+' : ''}{kpis.ipca?.delta} vs anterior
              </p>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl">
              <p className="text-sm text-slate-400">Taxa Selic Over</p>
              <h2 className="text-3xl font-mono text-white mt-2">{kpis.selic?.valor}% a.a.</h2>
              <p className="text-xs mt-2 font-mono text-slate-500">
                — Estável vs anterior
              </p>
            </div>
            <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl">
              <p className="text-sm text-slate-400">Dólar Comercial (PTAX)</p>
              <h2 className="text-3xl font-mono text-white mt-2">R$ {kpis.dolar?.valor}</h2>
              <p className={`text-xs mt-2 font-mono ${Number(kpis.dolar?.delta) < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {Number(kpis.dolar?.delta) > 0 ? '+' : ''}{kpis.dolar?.delta} vs anterior
              </p>
            </div>
          </>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Projeções Boletim Focus (IPCA)</h3>
          <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl space-y-2">
            {!focusMensal.error && focusMensal.ipca?.map((v: any, i: number) => (
              <div key={i} className="flex justify-between border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-400">{v.DataReferencia}</span>
                <span className="font-mono text-emerald-400">{v.Mediana}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Curva Copom Focus</h3>
          <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl space-y-2">
            {!focusCopom.error && focusCopom.reuniões?.map((v: any, i: number) => (
              <div key={i} className="flex justify-between border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-400">{v.Reuniao}</span>
                <span className="font-mono text-blue-400">{v.Mediana}% a.a.</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white">Agente de Inteligência Institucional (RAG)</h3>
        <Suspense fallback={<div className="h-24 bg-[#0f172a] animate-pulse rounded-xl" />}>
          <RagChat />
        </Suspense>
      </section>

      {/* Lazy Loaded Sections */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white">Simulador de Cenários Base-Correlacionado</h3>
        <Suspense fallback={<div className="h-40 bg-[#0f172a] animate-pulse rounded-xl" />}>
          <WhatIfCalculator />
        </Suspense>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white">Mercados e Curvas de Juros</h3>
        <Suspense fallback={<div className="h-96 bg-[#0f172a] animate-pulse rounded-xl" />}>
          <TradingViewWidget />
        </Suspense>
      </section>
    </div>
  );
}
