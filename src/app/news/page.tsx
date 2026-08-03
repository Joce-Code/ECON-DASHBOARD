"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, TrendingDown, RefreshCw, Search, Info, ShieldAlert, Zap, 
  Newspaper, Layers, CheckCircle2, ArrowUpRight, ArrowDownRight, Globe2,
  DollarSign, Activity, FileText, Sparkles
} from 'lucide-react';

interface AssetQuote {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  updatedAt: string;
}

interface NewsItem {
  title: string;
  summary: string;
  impact: 'POSITIVO' | 'NEGATIVO' | 'NEUTRO';
  impactDetail: string;
}

interface AiAnalysis {
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number;
  sentimentReason: string;
  newsList: NewsItem[];
  catalysts: string[];
  macroSummary: {
    macroDiagnosis: string;
    fixedIncomeCDI: string;
    fixedIncomeIPCAAndPre: string;
    equityStocks: string;
    equityFIIs: string;
  };
}

// Dicionário de Tooltips Educativos para os Indicadores e Seções Macro
const MACRO_TOOLTIPS: Record<string, { concept: string; macroRelation: string; assetImpact: string }> = {
  SELIC: {
    concept: 'A Selic é a taxa básica de juros da economia brasileira, definida pelo Banco Central (Copom).',
    macroRelation: 'Quando a Selic sobe, o custo do crédito aumenta, desestimulando o consumo e contendo a inflação.',
    assetImpact: 'Renda Fixa Pós-Fixada (CDI) rende mais. Renda Variável e empresas alavancadas sofrem pelo maior custo de dívida.'
  },
  IPCA: {
    concept: 'O IPCA é o índice oficial de inflação do Brasil, medido pelo IBGE.',
    macroRelation: 'Mede o aumento do custo de vida e perda de poder de compra da moeda.',
    assetImpact: 'Títulos indexados ao IPCA (NTN-B) protegem o patrimônio real. Inflação alta corrói lucros de empresas que não repassam preços.'
  },
  DOLAR: {
    concept: 'A taxa PTAX representa a cotação média diária do Dólar americano calculada pelo Banco Central.',
    macroRelation: 'Dólar alto encarece insumos importados e combustíveis, gerando pressão inflacionária de custos.',
    assetImpact: 'Favorece exportadoras (ex: Vale, Petrobras, IVVB11) e pressiona empresas voltadas exclusivamente ao mercado interno.'
  },
  CURVA_DI: {
    concept: 'A Curva DI representa as taxas de juros negociadas no mercado futuro (B3) para prazos de 1 a 10 anos.',
    macroRelation: 'Reflete a expectativa do mercado sobre a saúde fiscal do governo e a inflação futura.',
    assetImpact: 'Juros futuros altos causam desvalorização imediata em títulos pré-fixados/IPCA+ e em cotas de Fundos Imobiliários (FIIs).'
  },
  MACRO_GERAL: {
    concept: 'O cenário macroeconômico engloba a saúde da economia nacional e internacional.',
    macroRelation: 'Combina política monetária (juros), política fiscal (gastos do governo) e liquidez global (Fed/EUA).',
    assetImpact: 'Define o fluxo de capital de grandes fundos institucionais entre ativos de proteção e ativos de risco.'
  },
  RENDA_FIXA: {
    concept: 'Classe de investimentos com regras de remuneração definidas no momento da aplicação.',
    macroRelation: 'Principal instrumento de captação de recursos para bancos (CDB) e para o governo (Tesouro).',
    assetImpact: 'Em momentos de Selic a 14%, oferece o melhor prêmio de risco com rentabilidade real expressiva e segurança.'
  },
  RENDA_VARIAVEL: {
    concept: 'Classe de ativos em que os retornos não são garantidos, variando conforme oferta e mercado (Ações, ETFs, FIIs).',
    macroRelation: 'Financia a expansão de empresas e projetos imobiliários da economia real.',
    assetImpact: 'Sensível ao ciclo de juros. Oferece alto potencial de valorização e dividendos no longo prazo.'
  }
};

const POPULAR_TICKERS = ['BOVA11', 'PETR4', 'VALE3', 'BBAS3', 'CMIG4', 'IVVB11', 'MXRF11', 'ITUB4'];

export default function NewsPage() {
  const [selectedTicker, setSelectedTicker] = useState<string>('BOVA11');
  const [inputTicker, setInputTicker] = useState<string>('');
  const [quote, setQuote] = useState<AssetQuote | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Carregar ativo favorito salvo no localStorage ao iniciar
  useEffect(() => {
    const savedTicker = localStorage.getItem('user_favorite_asset');
    if (savedTicker) {
      setSelectedTicker(savedTicker.toUpperCase());
    }
  }, []);

  const fetchNewsAndData = useCallback(async (ticker: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/asset-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });
      const data = await res.json();
      setQuote(data.quote);
      setAnalysis(data.analysis);

      // Salvar no localStorage como favorito
      localStorage.setItem('user_favorite_asset', ticker);
    } catch (err) {
      console.error('Erro ao buscar notícias do ativo:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNewsAndData(selectedTicker);
  }, [selectedTicker, fetchNewsAndData]);

  const handleSelectTicker = (t: string) => {
    const clean = t.trim().toUpperCase();
    if (clean) {
      setSelectedTicker(clean);
      setInputTicker('');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputTicker.trim()) {
      handleSelectTicker(inputTicker);
    }
  };

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header da Aba */}
      <header className="flex flex-wrap justify-between items-center gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5">
              <Sparkles size={16} />
              <span>AI INTELLIGENCE</span>
            </div>
            <span className="badge badge-cyan">Notícias & Desempenho Diário do Ativo</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Inteligência do Ativo & Resumo Macroeconômico
          </h1>
          <p className="text-xs text-slate-400">
            Acompanhe o desempenho do dia do seu ativo favorito (ex: <strong className="text-cyan-400">BOVA11</strong>) e receba o boletim de notícias e diagnósticos por IA (Groq Llama 3.3 70B).
          </p>
        </div>

        {/* Seletor & Busca de Ativos */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <form onSubmit={handleSearchSubmit} className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 focus-within:border-cyan-500 transition-all">
            <Search size={16} className="text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Digite o código (ex: BOVA11)..."
              value={inputTicker}
              onChange={(e) => setInputTicker(e.target.value)}
              className="bg-transparent text-white text-xs outline-none w-36 font-mono font-semibold"
            />
            <button type="submit" className="text-xs font-bold text-cyan-400 hover:text-cyan-300 ml-1">
              Buscar
            </button>
          </form>

          <button
            onClick={() => fetchNewsAndData(selectedTicker)}
            disabled={loading}
            className="bg-cyan-500/15 text-[var(--accent-cyan)] border border-cyan-500/30 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-cyan-500/25 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Atualizando IA...' : 'Atualizar Notícias'}
          </button>
        </div>
      </header>

      {/* Barra de Ativos Populares para Troca Rápida */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
          <Globe2 size={14} className="text-cyan-400" /> Ativos em Destaque:
        </span>
        {POPULAR_TICKERS.map((t) => (
          <button
            key={t}
            onClick={() => handleSelectTicker(t)}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              selectedTicker === t
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20 scale-105'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* SECTION 1: Cotação e Notícias Diárias do Ativo Selecionado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card de Cotação Diária ao Vivo */}
        <div className="glass-card p-6 lg:col-span-1 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-2xl font-black text-white font-mono">{quote?.ticker || selectedTicker}</span>
                <p className="text-xs text-slate-400 font-medium line-clamp-1">{quote?.name}</p>
              </div>
              {quote && (
                <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 ${
                  quote.changePercent >= 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}>
                  {quote.changePercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                </span>
              )}
            </div>

            <div className="mt-4">
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                {quote ? formatBRL(quote.price) : 'R$ ---'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Cotação oficial de mercado • Atualizado às {quote?.updatedAt || '--:--'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">Máxima do Dia</span>
                <span className="text-emerald-400 font-bold">{quote ? formatBRL(quote.high) : '---'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">Mínima do Dia</span>
                <span className="text-rose-400 font-bold">{quote ? formatBRL(quote.low) : '---'}</span>
              </div>
            </div>
          </div>

          {/* Análise de Sentimento da IA */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-cyan-500/30 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Activity size={16} className="text-cyan-400" /> Sentimento da IA (Groq)
              </span>
              {analysis && (
                <span className={`badge ${
                  analysis.sentiment === 'BULLISH' ? 'badge-emerald' : analysis.sentiment === 'BEARISH' ? 'badge-rose' : 'badge-amber'
                }`}>
                  {analysis.sentiment === 'BULLISH' ? 'Otimista' : analysis.sentiment === 'BEARISH' ? 'Cauteloso' : 'Neutro'} ({analysis.sentimentScore} pts)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 italic">
              &quot;{analysis?.sentimentReason || 'Carregando análise diagnóstica...'}&quot;
            </p>
          </div>
        </div>

        {/* Feed de Notícias & Fatos Relevantes por IA */}
        <div className="glass-card p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Newspaper size={20} className="text-cyan-400" />
              <h2 className="text-base font-bold text-white">
                Principais Notícias & Impactos em {selectedTicker}
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Boletim Diário</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <RefreshCw size={24} className="spin mx-auto text-cyan-400" />
              <p className="text-xs font-medium">Processando notícias e contexto de mercado com Groq Llama 3.3 70B...</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {analysis?.newsList.map((news, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/30 transition-all space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-sm font-bold text-white hover:text-cyan-300 transition-colors">
                      {news.title}
                    </h3>
                    <span className={`badge ${
                      news.impact === 'POSITIVO' ? 'badge-emerald' : news.impact === 'NEGATIVO' ? 'badge-rose' : 'badge-cyan'
                    }`}>
                      Impacto {news.impact}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {news.summary}
                  </p>
                  <div className="text-[11px] text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20 font-medium">
                    📌 {news.impactDetail}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Radar Macroeconômico & Tendências de Renda Fixa e Renda Variável com Tooltips no Hover */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-400">
              <Zap size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Radar Macroeconômico & Tendências de Investimentos
              </h2>
              <p className="text-xs text-slate-400">
                Passe o mouse nos botões <span className="text-cyan-400 font-bold font-mono">(i)</span> para ver a relação de cada indicador com os ativos.
              </p>
            </div>
          </div>
        </div>

        {/* Grid de Indicadores Macroeconômicos com Tooltips Educativos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Indicador Selic */}
          <div className="relative group p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                Selic Oficial (BCB)
              </span>
              <button 
                onMouseEnter={() => setActiveTooltip('SELIC')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="text-cyan-400 hover:text-cyan-300 p-1 rounded-full bg-cyan-500/10"
              >
                <Info size={15} />
              </button>
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">14,00% a.a.</div>
            <div className="text-[11px] text-slate-500 mt-1">Patamar Contracionista</div>

            {/* Popover / Tooltip no Hover */}
            {activeTooltip === 'SELIC' && (
              <div className="absolute left-0 bottom-full mb-2 w-72 p-3.5 rounded-xl bg-[#0f172a] border border-cyan-500/40 shadow-2xl text-xs space-y-2 z-50 animate-fade-in">
                <div className="font-bold text-cyan-400 border-b border-white/10 pb-1">📌 Selic Meta</div>
                <p className="text-slate-300">{MACRO_TOOLTIPS.SELIC.concept}</p>
                <div className="text-[11px] text-amber-300"><strong>Macro:</strong> {MACRO_TOOLTIPS.SELIC.macroRelation}</div>
                <div className="text-[11px] text-emerald-300"><strong>Investimentos:</strong> {MACRO_TOOLTIPS.SELIC.assetImpact}</div>
              </div>
            )}
          </div>

          {/* Indicador IPCA */}
          <div className="relative group p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 transition-all">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-400 font-medium">IPCA Focus (12m)</span>
              <button 
                onMouseEnter={() => setActiveTooltip('IPCA')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="text-cyan-400 hover:text-cyan-300 p-1 rounded-full bg-cyan-500/10"
              >
                <Info size={15} />
              </button>
            </div>
            <div className="text-2xl font-black text-rose-400 font-mono">4,50% a.a.</div>
            <div className="text-[11px] text-slate-500 mt-1">Teto da Meta CMN</div>

            {activeTooltip === 'IPCA' && (
              <div className="absolute left-0 bottom-full mb-2 w-72 p-3.5 rounded-xl bg-[#0f172a] border border-cyan-500/40 shadow-2xl text-xs space-y-2 z-50 animate-fade-in">
                <div className="font-bold text-cyan-400 border-b border-white/10 pb-1">📌 Inflação (IPCA)</div>
                <p className="text-slate-300">{MACRO_TOOLTIPS.IPCA.concept}</p>
                <div className="text-[11px] text-amber-300"><strong>Macro:</strong> {MACRO_TOOLTIPS.IPCA.macroRelation}</div>
                <div className="text-[11px] text-emerald-300"><strong>Investimentos:</strong> {MACRO_TOOLTIPS.IPCA.assetImpact}</div>
              </div>
            )}
          </div>

          {/* Indicador Dólar PTAX */}
          <div className="relative group p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-all">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-400 font-medium">Câmbio Dólar PTAX</span>
              <button 
                onMouseEnter={() => setActiveTooltip('DOLAR')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="text-cyan-400 hover:text-cyan-300 p-1 rounded-full bg-cyan-500/10"
              >
                <Info size={15} />
              </button>
            </div>
            <div className="text-2xl font-black text-cyan-400 font-mono">R$ 5,55</div>
            <div className="text-[11px] text-slate-500 mt-1">Volatilidade de Câmbio</div>

            {activeTooltip === 'DOLAR' && (
              <div className="absolute left-0 bottom-full mb-2 w-72 p-3.5 rounded-xl bg-[#0f172a] border border-cyan-500/40 shadow-2xl text-xs space-y-2 z-50 animate-fade-in">
                <div className="font-bold text-cyan-400 border-b border-white/10 pb-1">📌 Dólar PTAX</div>
                <p className="text-slate-300">{MACRO_TOOLTIPS.DOLAR.concept}</p>
                <div className="text-[11px] text-amber-300"><strong>Macro:</strong> {MACRO_TOOLTIPS.DOLAR.macroRelation}</div>
                <div className="text-[11px] text-emerald-300"><strong>Investimentos:</strong> {MACRO_TOOLTIPS.DOLAR.assetImpact}</div>
              </div>
            )}
          </div>

          {/* Indicador Curva DI */}
          <div className="relative group p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 transition-all">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-400 font-medium">Curva DI Longa</span>
              <button 
                onMouseEnter={() => setActiveTooltip('CURVA_DI')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="text-cyan-400 hover:text-cyan-300 p-1 rounded-full bg-cyan-500/10"
              >
                <Info size={15} />
              </button>
            </div>
            <div className="text-2xl font-black text-purple-400 font-mono">13,85% a.a.</div>
            <div className="text-[11px] text-slate-500 mt-1">Prêmio de Risco Elevado</div>

            {activeTooltip === 'CURVA_DI' && (
              <div className="absolute left-0 bottom-full mb-2 w-72 p-3.5 rounded-xl bg-[#0f172a] border border-cyan-500/40 shadow-2xl text-xs space-y-2 z-50 animate-fade-in">
                <div className="font-bold text-cyan-400 border-b border-white/10 pb-1">📌 Juros Futuros (DI)</div>
                <p className="text-slate-300">{MACRO_TOOLTIPS.CURVA_DI.concept}</p>
                <div className="text-[11px] text-amber-300"><strong>Macro:</strong> {MACRO_TOOLTIPS.CURVA_DI.macroRelation}</div>
                <div className="text-[11px] text-emerald-300"><strong>Investimentos:</strong> {MACRO_TOOLTIPS.CURVA_DI.assetImpact}</div>
              </div>
            )}
          </div>
        </div>

        {/* Diagnóstico da Tendência Macroeconômica */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe2 size={18} className="text-cyan-400" />
              Tendência & Diagnóstico Macroeconômico Geral (IA Groq Llama 3.3 70B)
            </h3>
            <button 
              onMouseEnter={() => setActiveTooltip('MACRO_GERAL')}
              onMouseLeave={() => setActiveTooltip(null)}
              className="text-cyan-400 hover:text-cyan-300 p-1 rounded-full bg-cyan-500/10 flex items-center gap-1 text-xs"
            >
              <Info size={14} /> O que significa?
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {analysis?.macroSummary.macroDiagnosis || 'Carregando diagnóstico de conjuntura macroeconômica...'}
          </p>
        </div>

        {/* Tendências por Classe de Ativo (Renda Fixa x Renda Variável) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna 1: Tendência da Renda Fixa */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-emerald-500/20 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <ShieldAlert size={18} />
                Tendência para Renda Fixa
              </h3>
              <button 
                onMouseEnter={() => setActiveTooltip('RENDA_FIXA')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="text-cyan-400 hover:text-cyan-300 p-1 rounded-full bg-cyan-500/10"
              >
                <Info size={15} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">Pós-Fixados (CDI / Selic):</span>
                <p className="text-slate-300 leading-relaxed">{analysis?.macroSummary.fixedIncomeCDI}</p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">Pré-Fixados & IPCA+ (NTN-B):</span>
                <p className="text-slate-300 leading-relaxed">{analysis?.macroSummary.fixedIncomeIPCAAndPre}</p>
              </div>
            </div>
          </div>

          {/* Coluna 2: Tendência da Renda Variável */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-cyan-500/20 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <TrendingUp size={18} />
                Tendência para Renda Variável
              </h3>
              <button 
                onMouseEnter={() => setActiveTooltip('RENDA_VARIAVEL')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="text-cyan-400 hover:text-cyan-300 p-1 rounded-full bg-cyan-500/10"
              >
                <Info size={15} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">Ações & ETFs ({selectedTicker} / Ibovespa):</span>
                <p className="text-slate-300 leading-relaxed">{analysis?.macroSummary.equityStocks}</p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">Fundos Imobiliários (FIIs):</span>
                <p className="text-slate-300 leading-relaxed">{analysis?.macroSummary.equityFIIs}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
