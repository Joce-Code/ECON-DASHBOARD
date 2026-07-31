'use client'

import { useTransition } from 'react'
import { createAlertRule, deleteAlertRule } from '@/app/settings/actions'

const AVAILABLE_KPIS = [
  { id: 'IPCA', label: 'IPCA Acumulado 12m' },
  { id: 'Selic', label: 'Taxa Selic Over' },
  { id: 'Dólar', label: 'Dólar Comercial (PTAX)' },
  { id: 'CDI', label: 'Taxa CDI (Acumulada)' },
]

export default function SettingsForm({ initialAlertRules }: { initialPortfolio?: string[], initialAlertRules: any[] }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="space-y-8">
      {/* Motor de Alertas Config */}
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
