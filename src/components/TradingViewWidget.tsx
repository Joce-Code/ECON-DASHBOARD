"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, BarChart2 } from "lucide-react";

interface SymbolOption {
  label: string;
  symbol: string;
  description: string;
}

const SYMBOLS: SymbolOption[] = [
  { label: "IBOV (Ibovespa)", symbol: "BMFBOVESPA:IBOV", description: "Índice Bovespa Oficial" },
  { label: "BOVA11", symbol: "BMFBOVESPA:BOVA11", description: "ETF Ibovespa B3" },
  { label: "Dólar (USD/BRL)", symbol: "FX_IDC:USDBRL", description: "Câmbio Dólar vs Real" },
  { label: "PETR4", symbol: "BMFBOVESPA:PETR4", description: "Petrobras PN" },
  { label: "VALE3", symbol: "BMFBOVESPA:VALE3", description: "Vale ON" },
  { label: "S&P 500 (IVVB11)", symbol: "BMFBOVESPA:IVVB11", description: "ETF S&P 500 Bolarizado" },
];

export default function TradingViewWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BMFBOVESPA:BOVA11");

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: "420",
      symbol: selectedSymbol,
      interval: "D",
      timezone: "America/Sao_Paulo",
      theme: "dark",
      style: "1",
      locale: "br",
      backgroundColor: "#090d16",
      gridColor: "#1e293b",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      hide_volume: false
    });

    containerRef.current.appendChild(script);
  }, [selectedSymbol]);

  return (
    <div className="space-y-3">
      {/* Seletor de Ativos do Gráfico */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0f172a] p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-cyan-400" />
          <span className="text-xs font-bold text-white">Selecione o Ativo para Visualizar o Gráfico:</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SYMBOLS.map((item) => (
            <button
              key={item.symbol}
              onClick={() => setSelectedSymbol(item.symbol)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                selectedSymbol === item.symbol
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20 scale-105'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
              title={item.description}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Widget Container */}
      <div className="w-full h-[420px] border border-slate-800 rounded-xl overflow-hidden bg-[#090d16]" ref={containerRef} />
    </div>
  );
}
