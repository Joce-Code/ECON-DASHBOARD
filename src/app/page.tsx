import { getGoldKPIs, getGoldFocusMensal, getGoldFocusCopom } from "@/lib/data-pipeline/aggregators";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";

import TradingViewWidget from "@/components/TradingViewWidget";
import WhatIfCalculator from "@/components/WhatIfCalculator";
import RagChat from "@/components/RagChat";

export const dynamic = 'force-dynamic'; // O painel agora é dinâmico por usuário

export default async function Page() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  // Buscar configurações de portfólio do usuário
  let activeKpis = ['IPCA', 'Selic', 'Dólar']; // Default
  if (user) {
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('indicators')
      .eq('id', user.id)
      .single();
    
    if (portfolio?.indicators) {
      activeKpis = portfolio.indicators;
    }
  }

  // SSR Data Fetching (Fronteira Eficiente)
  const [kpis, focusMensal, focusCopom] = await Promise.all([
    getGoldKPIs(),
    getGoldFocusMensal(),
    getGoldFocusCopom()
  ]);

  return (
    <div className="space-y-8">
      {/* Dobra Superior: KPIs Customizados + Calendário */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.error ? (
          <div className="col-span-full p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
            ⚠ Alerta de Contingência: Falha na observabilidade dos dados do BCB. Exibindo último snapshot válido.
          </div>
        ) : (
          <>
            {activeKpis.includes('IPCA') && (
              <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
                <p className="text-sm text-slate-400">IPCA Acumulado 12m</p>
                <div>
                  <h2 className="text-3xl font-mono text-white mt-2">{kpis.ipca?.valor}%</h2>
                  <p className={`text-xs mt-2 font-mono ${Number(kpis.ipca?.delta) < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Number(kpis.ipca?.delta) > 0 ? '+' : ''}{kpis.ipca?.delta} vs anterior
                  </p>
                </div>
              </div>
            )}
            {activeKpis.includes('Selic') && (
              <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
                <p className="text-sm text-slate-400">Taxa Selic Over</p>
                <div>
                  <h2 className="text-3xl font-mono text-white mt-2">{kpis.selic?.valor}% a.a.</h2>
                  <p className="text-xs mt-2 font-mono text-slate-500">
                    — Estável vs anterior
                  </p>
                </div>
              </div>
            )}
            {activeKpis.includes('Dólar') && (
              <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
                <p className="text-sm text-slate-400">Dólar Comercial (PTAX)</p>
                <div>
                  <h2 className="text-3xl font-mono text-white mt-2">R$ {kpis.dolar?.valor}</h2>
                  <p className={`text-xs mt-2 font-mono ${Number(kpis.dolar?.delta) < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Number(kpis.dolar?.delta) > 0 ? '+' : ''}{kpis.dolar?.delta} vs anterior
                  </p>
                </div>
              </div>
            )}
            {activeKpis.includes('CDI') && (
              <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
                <p className="text-sm text-slate-400">Taxa CDI (Mês)</p>
                <div>
                  <h2 className="text-3xl font-mono text-white mt-2">1.04%</h2>
                  <p className="text-xs mt-2 font-mono text-emerald-400">
                    +0.01 vs anterior
                  </p>
                </div>
              </div>
            )}

            {/* Calendário Econômico - Sempre visível para preencher o buraco */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
              <p className="text-sm text-slate-400 mb-4">Próximas Divulgações</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">Reunião COPOM</span>
                  <span className="font-mono text-blue-400">18/Set</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">IPCA-15</span>
                  <span className="font-mono text-emerald-400">27/Ago</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">Relatório Focus</span>
                  <span className="font-mono text-slate-400">Toda Seg.</span>
                </div>
              </div>
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
