'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updatePortfolio, createAlertRule, deleteAlertRule } from '@/app/settings/actions'

const AVAILABLE_KPIS = [
  { id: 'IPCA', label: 'IPCA Acumulado 12m' },
  { id: 'Selic', label: 'Taxa Selic Over' },
  { id: 'Dólar', label: 'Dólar Comercial (PTAX)' },
  { id: 'CDI', label: 'Taxa CDI (Acumulada)' },
]

export default function SettingsForm({ initialPortfolio, initialAlertRules }: { initialPortfolio: string[], initialAlertRules: any[] }) {
  const router = useRouter()
  const [portfolio, setPortfolio] = useState<string[]>(initialPortfolio)
  const [isPending, startTransition] = useTransition()
  const [savingPortfolio, setSavingPortfolio] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

  const toggleKpi = (id: string) => {
    const newPortfolio = portfolio.includes(id) 
      ? portfolio.filter(p => p !== id)
      : [...portfolio, id]
    
    setPortfolio(newPortfolio)
    setSavedOk(false)
  }

  const savePortfolio = async () => {
    setSavingPortfolio(true)
    try {
      await updatePortfolio(portfolio)
      setSavedOk(true)
      router.refresh()
    } finally {
      setSavingPortfolio(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Portfolio Config */}
      <section className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl">
        <h3 className="text-lg font-medium text-white mb-4">Seu Portfólio</h3>
        <p className="text-sm text-slate-400 mb-4">Selecione os indicadores que deseja acompanhar na página principal.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {AVAILABLE_KPIS.map(kpi => (
            <label key={kpi.id} className="flex items-center space-x-3 cursor-pointer group">
              <input 
                type="checkbox"
                checked={portfolio.includes(kpi.id)}
                onChange={() => toggleKpi(kpi.id)}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
              <span className="text-slate-300 group-hover:text-white transition-colors">{kpi.label}</span>
            </label>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={savePortfolio}
            disabled={savingPortfolio}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {savingPortfolio ? 'Salvando...' : 'Salvar Portfólio'}
          </button>
          {savedOk && <span className="text-emerald-400 text-sm font-medium">Salvo com sucesso!</span>}
        </div>
      </section>

      {/* Alert Rules Config */}
      <section className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl">
        <h3 className="text-lg font-medium text-white mb-4">Motor de Alertas</h3>
        <p className="text-sm text-slate-400 mb-6">Configure gatilhos para ser notificado por e-mail automaticamente.</p>
        
        <form action={createAlertRule} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <select name="indicator" required className="bg-slate-800 border border-slate-700 text-white rounded p-2 focus:ring-blue-500">
            {AVAILABLE_KPIS.map(kpi => (
              <option key={kpi.id} value={kpi.id}>{kpi.id}</option>
            ))}
          </select>

          <select name="condition" required className="bg-slate-800 border border-slate-700 text-white rounded p-2 focus:ring-blue-500">
            <option value=">">Maior que (&gt;)</option>
            <option value="<">Menor que (&lt;)</option>
            <option value="=">Igual a (=)</option>
          </select>

          <input type="number" step="0.01" name="threshold" placeholder="Valor" required className="bg-slate-800 border border-slate-700 text-white rounded p-2 focus:ring-blue-500" />
          
          <input type="email" name="email_target" placeholder="E-mail de destino" required className="bg-slate-800 border border-slate-700 text-white rounded p-2 focus:ring-blue-500" />
          
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            Adicionar Regra
          </button>
        </form>

        {/* List of active rules */}
        <div className="space-y-2">
          {initialAlertRules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between bg-slate-800/50 border border-slate-700 p-3 rounded-lg">
              <div className="text-sm">
                <span className="font-mono text-blue-400">{rule.indicator}</span>{' '}
                <span className="text-slate-400">{rule.condition}</span>{' '}
                <span className="font-mono text-emerald-400">{rule.threshold}</span>{' '}
                <span className="text-slate-500 mx-2">→</span>
                <span className="text-slate-300">{rule.email_target}</span>
              </div>
              <button 
                onClick={() => {
                  startTransition(() => {
                    deleteAlertRule(rule.id)
                  })
                }}
                className="text-slate-500 hover:text-rose-400 transition-colors"
                title="Excluir regra"
              >
                ✕
              </button>
            </div>
          ))}
          {initialAlertRules.length === 0 && (
            <p className="text-sm text-slate-500 italic">Nenhuma regra de alerta configurada.</p>
          )}
        </div>
      </section>
    </div>
  )
}
