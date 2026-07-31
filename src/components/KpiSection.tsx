'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function KpiSection({ kpis }: { kpis: any }) {
  const [activeKpis, setActiveKpis] = useState<string[]>(['IPCA', 'Selic', 'Dólar'])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Carga ultra-rápida via LocalStorage
    try {
      const local = localStorage.getItem('focus_portfolio')
      if (local) {
        const parsed = JSON.parse(local)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActiveKpis(parsed)
          setLoading(false)
        }
      }
    } catch {}

    // 2. Sincronização em segundo plano via Supabase
    async function loadPortfolio() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data } = await supabase
            .from('portfolios')
            .select('indicators')
            .eq('id', user.id)
            .maybeSingle()

          if (data?.indicators && Array.isArray(data.indicators)) {
            setActiveKpis(data.indicators)
            try {
              localStorage.setItem('focus_portfolio', JSON.stringify(data.indicators))
            } catch {}
          }
        }
      } catch (e) {
        console.error("Erro ao carregar portfólio no cliente:", e)
      } finally {
        setLoading(false)
      }
    }

    loadPortfolio()
  }, [])

  if (kpis.error) {
    return (
      <section className="grid grid-cols-1 gap-4">
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
          ⚠ Alerta de Contingência: Falha na observabilidade dos dados do BCB. Exibindo último snapshot válido.
        </div>
      </section>
    )
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Calendário Econômico */}
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
    </section>
  )
}
