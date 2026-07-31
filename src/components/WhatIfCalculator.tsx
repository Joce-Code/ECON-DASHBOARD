"use client";
import { useState, useEffect } from "react";

export default function WhatIfCalculator() {
  const [dolar, setDolar] = useState(5.50);
  const [ipcaProj, setIpcaProj] = useState(4.00);
  const [selicProj, setSelicProj] = useState(10.50);

  // Regra de Correlação Estocástica (Simplificada para MVP)
  // Choque de R$0.10 no câmbio -> +0.15% no IPCA -> +0.25% na Selic
  useEffect(() => {
    const deltaCambio = dolar - 5.50;
    const ipcaChoque = deltaCambio * (0.15 / 0.10);
    const selicChoque = ipcaChoque > 0 ? ipcaChoque * (0.25 / 0.15) : 0;
    
    setIpcaProj(Number((4.00 + ipcaChoque).toFixed(2)));
    setSelicProj(Number((10.50 + selicChoque).toFixed(2)));
  }, [dolar]);

  return (
    <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl flex flex-col md:flex-row gap-8 items-center">
      <div className="flex-1 space-y-4">
        <label className="text-slate-400 text-sm">Choque de Câmbio (R$)</label>
        <input 
          type="range" 
          min="4.50" max="6.50" step="0.05"
          value={dolar}
          onChange={(e) => setDolar(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="text-2xl font-mono text-white">R$ {dolar.toFixed(2)}</div>
      </div>
      
      <div className="w-px h-24 bg-slate-800 hidden md:block"></div>
      
      <div className="flex-1 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-sm text-slate-400">Impacto IPCA 12m</p>
          <p className={`text-2xl font-mono mt-2 ${ipcaProj > 4.5 ? 'text-rose-400' : 'text-emerald-400'}`}>{ipcaProj}%</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Impacto Selic Curva</p>
          <p className="text-2xl font-mono text-white mt-2">{selicProj}% a.a.</p>
        </div>
      </div>
    </div>
  );
}
