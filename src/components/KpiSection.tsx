'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { updatePortfolio } from '@/app/settings/actions'

const AVAILABLE_KPIS = [
  { id: 'IPCA', label: 'IPCA Acumulado 12m' },
  { id: 'IPCA Meta', label: 'Meta de Inflação CMN' },
  { id: 'Selic', label: 'Taxa Selic Over' },
  { id: 'Selic Meta', label: 'Taxa Selic Meta Copom' },
  { id: 'Dólar', label: 'Dólar Comercial (PTAX)' },
  { id: 'CDI', label: 'Taxa CDI (Acumulada)' },
]

export default function KpiSection({ kpis }: { kpis: any }) {
  const [activeKpis, setActiveKpis] = useState<string[]>(['IPCA', 'Selic', 'Dólar'])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // 1. Carga ultra-rápida via LocalStorage
    try {
      const local = localStorage.getItem('focus_portfolio')
      if (local) {
        const parsed = JSON.parse(local)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActiveKpis(parsed)
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
      }
    }

    loadPortfolio()
  }, [])

  const toggleKpi = async (id: string) => {
    const next = activeKpis.includes(id)
      ? activeKpis.filter(k => k !== id)
      : [...activeKpis, id]

    setActiveKpis(next)
    try {
      localStorage.setItem('focus_portfolio', JSON.stringify(next))
    } catch {}

    setSaving(true)
    try {
      await updatePortfolio(next)
    } catch (e) {
      console.error("Erro ao salvar no banco:", e)
    } finally {
      setSaving(false)
    }
  }

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
    <div className="space-y-4">
      {/* Botão de Rodinha / Configuração Direta */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Indicadores em Destaque</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-all shadow-sm"
        >
          <span>⚙️</span>
          <span>Personalizar Cartões</span>
        </button>
      </div>

      {/* Grid de Cartões */}
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

        {activeKpis.includes('IPCA Meta') && (
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
            <p className="text-sm text-slate-400">Meta Inflação CMN</p>
            <div>
              <h2 className="text-3xl font-mono text-white mt-2">{kpis.ipcaMeta?.valor || 3.00}%</h2>
              <p className="text-xs mt-2 font-mono text-blue-400">
                Banda: 1.50% a 4.50%
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

        {activeKpis.includes('Selic Meta') && (
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
            <p className="text-sm text-slate-400">Taxa Selic Meta (Copom)</p>
            <div>
              <h2 className="text-3xl font-mono text-white mt-2">{kpis.selicMeta?.valor}% a.a.</h2>
              <p className="text-xs mt-2 font-mono text-emerald-400">
                Meta Oficial BCB
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

        {/* Calendário Econômico - Sempre visível */}
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

      {/* Modal de Configuração Direta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <span className="text-lg">⚙️</span>
                <h3 className="text-lg font-semibold text-white">Personalizar Painel</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Marque os indicadores que deseja exibir na tela principal. As mudanças são refletidas instantaneamente.
            </p>

            <div className="space-y-3">
              {AVAILABLE_KPIS.map(kpi => (
                <label 
                  key={kpi.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                >
                  <span className="text-sm font-medium text-slate-200">{kpi.label}</span>
                  <input 
                    type="checkbox"
                    checked={activeKpis.includes(kpi.id)}
                    onChange={() => toggleKpi(kpi.id)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                {saving ? "Salvando na nuvem..." : "Sincronizado"}
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
