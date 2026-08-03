import { getGoldKPIs, getGoldFocusMensal, getGoldFocusCopom } from "@/lib/data-pipeline/aggregators";
import { Suspense } from "react";

import TradingViewWidget from "@/components/TradingViewWidget";
import WhatIfCalculator from "@/components/WhatIfCalculator";
import RagChat from "@/components/RagChat";
import KpiSection from "@/components/KpiSection";

export const dynamic = 'force-dynamic';

export default async function Page() {
  // SSR Data Fetching (Fronteira Eficiente)
  const [kpis, focusMensal, focusCopom] = await Promise.all([
    getGoldKPIs(),
    getGoldFocusMensal(),
    getGoldFocusCopom()
  ]);

  return (
    <div className="space-y-8">
      {/* Dobra Superior: KPIs Customizados + Calendário (Reatividade em tempo real) */}
      <KpiSection kpis={kpis} />

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
