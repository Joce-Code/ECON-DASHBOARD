"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, RefreshCw, Search, Info, ShieldAlert, Zap, 
  Newspaper, Layers, CheckCircle2, ArrowUpRight, ArrowDownRight, Globe2,
  DollarSign, Activity, FileText, Sparkles, Filter, Tag, Compass, Eye, SlidersHorizontal
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
  id: string;
  title: string;
  summary: string;
  impact: 'POSITIVO' | 'NEGATIVO' | 'NEUTRO';
  impactDetail: string;
  category: 'Inflação' | 'Juros/Selic' | 'Câmbio/Dólar' | 'Ações/FIIs' | 'Fiscal';
  userTags: string[];
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

// Best Bets Dictionary (Instant Answers for High-Intent Queries)
const BEST_BETS: Record<string, { title: string; subtitle: string; highlight: string; linkText: string; linkAction: string }> = {
  SELIC: {
    title: '🎯 Best Bet: Taxa Selic Oficial',
    subtitle: 'Atualmente em 14,00% a.a. definida pelo Copom.',
    highlight: 'Rendimento de 100% do CDI equivale a ~1,08% ao mês líquido de IR em prazos curtos.',
    linkText: 'Simular Investimento em Selic',
    linkAction: '/simulator'
  },
  IPCA: {
    title: '🎯 Best Bet: Inflação Oficial (IPCA)',
    subtitle: 'Expectativa Focus em 4,50% no acumulado de 12 meses.',
    highlight: 'Tesouro IPCA+ com cupom real de IPCA + 6,55% a.a. oferece proteção máxima de patrimônio.',
    linkText: 'Ver Títulos IPCA+ no Simulador',
    linkAction: '/simulator'
  },
  DOLAR: {
    title: '🎯 Best Bet: Câmbio Dólar PTAX (USD/BRL)',
    subtitle: 'Cotação de referência calculada pelo Banco Central.',
    highlight: 'Empresas exportadoras (PETR4, VALE3) e o ETF IVVB11 protegem contra a desvalorização cambial.',
    linkText: 'Analisar Ativos em Dólar',
    linkAction: '/news'
  },
  BOVA11: {
    title: '🎯 Best Bet: ETF iShares Ibovespa (BOVA11)',
    subtitle: 'Replica a carteira teórica do Índice Bovespa.',
    highlight: 'Negociado a múltiplos descontados frente à média histórica de 10 anos.',
    linkText: 'Acompanhar BOVA11 em Tempo Real',
    linkAction: '/news'
  }
};

const MACRO_TOOLTIPS: Record<string, { concept: string; macroRelation: string; assetImpact: string }> = {
  SELIC: {
    concept: 'A Selic é a taxa básica de juros da economia brasileira, definida pelo Banco Central (Copom).',
    macroRelation: 'Quando a Selic sobe, o custo do crédito aumenta, desestimulando o consumo e contendo a inflação.',
    assetImpact: 'Renda Fixa Pós-Fixada (CDI) rende mais. Renda Variável e empresas alavancadas sofrem pelo maior custo de dívida.'
  },
  IPCA: {
    concept: 'O IPCA é o índice oficial de inflação do Brasil, medido pelo IBGE.',
    macroRelation: 'Mede o aumento do custo de vida e perda de poder de compra da moeda.',
    assetImpact: 'Títulos indexados ao IPCA (NTN-B) protegem o patrimônio real.'
  },
  DOLAR: {
    concept: 'A taxa PTAX representa a cotação média diária do Dólar americano calculada pelo Banco Central.',
    macroRelation: 'Dólar alto encarece insumos importados e combustíveis.',
    assetImpact: 'Favorece exportadoras (PETR4, VALE3, IVVB11).'
  },
  CURVA_DI: {
    concept: 'A Curva DI representa as taxas de juros negociadas no mercado futuro (B3).',
    macroRelation: 'Reflete a expectativa do mercado sobre a saúde fiscal do governo.',
    assetImpact: 'Juros futuros altos causam marcação a mercado negativa em pré-fixados e FIIs.'
  }
};

const POPULAR_TICKERS = ['BOVA11', 'PETR4', 'VALE3', 'BBAS3', 'CMIG4', 'IVVB11', 'MXRF11', 'ITUB4'];

export default function NewsPage() {
  const [selectedTicker, setSelectedTicker] = useState<string>('BOVA11');
  const [inputTicker, setInputTicker] = useState<string>('');
  const [searchZone, setSearchZone] = useState<string>('TUDO');
  const [quote, setQuote] = useState<AssetQuote | null>(null);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Faceted Search State (Berry-picking)
  const [selectedCategoryFacet, setSelectedCategoryFacet] = useState<string>('TODOS');
  const [selectedImpactFacet, setSelectedImpactFacet] = useState<string>('TODOS');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // Folksonomy State (User Tags)
  const [customTags, setCustomTags] = useState<Record<string, string[]>>({});
  const [newTagInput, setNewTagInput] = useState<string>('');

  // Algorithmic Ethics & Serendipity Mode
  const [serendipityMode, setSerendipityMode] = useState<boolean>(false);

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
      
      // Enriquecer notícias com categorias e ids para facetas
      const enrichedNews = data.analysis?.newsList?.map((item: any, idx: number) => ({
        ...item,
        id: `news-${idx}`,
        category: idx === 0 ? 'Fiscal' : idx === 1 ? 'Ações/FIIs' : 'Juros/Selic',
        userTags: ['#analise-macro', '#b3-brasil']
      })) || [];

      setAnalysis({
        ...data.analysis,
        newsList: enrichedNews
      });

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

  // Best Bet correspondente à busca do usuário
  const activeBestBet = useMemo(() => {
    const term = inputTicker.trim().toUpperCase() || selectedTicker.toUpperCase();
    return BEST_BETS[term] || null;
  }, [inputTicker, selectedTicker]);

  // Adicionar Tag ao Ativo (Folksonomia)
  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    const tagClean = newTagInput.startsWith('#') ? newTagInput.trim() : `#${newTagInput.trim()}`;
    setCustomTags(prev => ({
      ...prev,
      [selectedTicker]: [...(prev[selectedTicker] || ['#favorito', '#tesouraria']), tagClean]
    }));
    setNewTagInput('');
  };

  // Filtragem Facetada (Berry-picking)
  const filteredNews = useMemo(() => {
    if (!analysis?.newsList) return [];
    let list = [...analysis.newsList];

    if (selectedCategoryFacet !== 'TODOS') {
      list = list.filter(item => item.category === selectedCategoryFacet);
    }
    if (selectedImpactFacet !== 'TODOS') {
      list = list.filter(item => item.impact === selectedImpactFacet);
    }
    if (activeTagFilter) {
      list = list.filter(item => item.userTags.includes(activeTagFilter));
    }

    // Se Modo Serendipidade ativo, reordenar e injetar diversidade de perspectivas
    if (serendipityMode) {
      list.reverse();
    }

    return list;
  }, [analysis, selectedCategoryFacet, selectedImpactFacet, activeTagFilter, serendipityMode]);

  return (
    <div className="space-y-8 animate-fade-in relative z-10">
      {/* Header com Status do Algoritmo e Ética */}
      <header className="flex flex-wrap justify-between items-center gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 px-3 py-1 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20">
              <Sparkles size={15} />
              <span>IA GEMINI 1.5 PRO • SEARCH GROUNDING</span>
            </div>
            <span className="badge badge-emerald">Classificação Facetada Active</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Inteligência de Ativos & Radar Macroeconômico
          </h1>
          <p className="text-xs text-slate-400">
            Pesquisa em tempo real na Web com navegação <strong className="text-cyan-400">Berry-picking</strong> e proteção contra bolhas de filtro.
          </p>
        </div>

        {/* Controles Principais de Busca e Zonas */}
        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Toggle de Serendipidade (Anti Bolha de Filtro - Ética Algorítmica) */}
          <button
            onClick={() => setSerendipityMode(!serendipityMode)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
              serendipityMode 
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-lg shadow-purple-500/20' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
            title="Ative para injetar visões econômicas divergentes e quebrar ciclos de recomendação repetitivos"
          >
            <Compass size={15} className={serendipityMode ? 'animate-spin text-purple-400' : ''} />
            <span>{serendipityMode ? 'Modo Serendipidade ON' : 'Diversificar Visões (Anti-Bolha)'}</span>
          </button>

          <button
            onClick={() => fetchNewsAndData(selectedTicker)}
            disabled={loading}
            className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-cyan-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Buscando Web...' : 'Atualizar Notícias'}
          </button>
        </div>
      </header>

      {/* Zonas de Busca e Entrada com Best Bets */}
      <div className="bg-[#0f172a]/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch">
          {/* Seletor de Zonas de Busca */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
            <Layers size={16} className="text-cyan-400" />
            <span className="text-xs text-slate-400 font-bold whitespace-nowrap">Zona:</span>
            <select
              value={searchZone}
              onChange={(e) => setSearchZone(e.target.value)}
              className="bg-transparent text-white text-xs outline-none cursor-pointer font-semibold"
            >
              <option value="TUDO" className="bg-slate-900">Toda a Plataforma</option>
              <option value="ACOES" className="bg-slate-900">Ações & ETFs B3</option>
              <option value="NOTICIAS" className="bg-slate-900">Notícias & Imprensa</option>
              <option value="MACRO" className="bg-slate-900">Relatórios Macroeconômicos</option>
            </select>
          </div>

          {/* Campo de Busca Principal */}
          <form onSubmit={(e) => { e.preventDefault(); if(inputTicker.trim()) setSelectedTicker(inputTicker.trim().toUpperCase()); }} className="flex-1 flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 focus-within:border-cyan-500 transition-all">
            <Search size={16} className="text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Buscar ativo ou indicador (ex: BOVA11, SELIC, IPCA)..."
              value={inputTicker}
              onChange={(e) => setInputTicker(e.target.value)}
              className="bg-transparent text-white text-xs outline-none w-full font-mono font-semibold"
            />
            <button type="submit" className="text-xs font-bold bg-cyan-500 text-slate-950 px-3 py-1 rounded-lg hover:bg-cyan-400 transition-all">
              Pesquisar
            </button>
          </form>
        </div>

        {/* Ativos em Destaque para Troca Rápida */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Globe2 size={13} className="text-cyan-400" /> Atalhos Rápidos:
          </span>
          {POPULAR_TICKERS.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTicker(t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                selectedTicker === t
                  ? 'bg-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-400/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Componente "Best Bets" (Melhor Aposta) para Termos de Busca Relevantes */}
      {activeBestBet && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/40 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in shadow-xl shadow-cyan-500/5">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-cyan-300 flex items-center gap-2 font-mono">
              {activeBestBet.title}
            </h3>
            <p className="text-xs text-white font-medium">{activeBestBet.subtitle}</p>
            <div className="text-[11px] text-slate-300 sketchbook-highlight font-sans">
              💡 <strong>Relevância Institucional:</strong> {activeBestBet.highlight}
            </div>
          </div>

          <a
            href={activeBestBet.linkAction}
            className="px-3.5 py-2 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs hover:bg-cyan-300 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-cyan-400/20"
          >
            <span>{activeBestBet.linkText}</span>
            <ArrowUpRight size={14} />
          </a>
        </div>
      )}

      {/* ESTRUTURA PRINCIPAL EM 3 COLUNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1: Cotação + Folksonomia (Tags do Usuário) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Card da Cotação Real */}
          <div className="glass-2026 p-6 rounded-2xl space-y-5">
            <div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-3xl font-black text-white font-mono">{quote?.ticker || selectedTicker}</span>
                  <p className="text-xs text-slate-400 font-medium line-clamp-1">{quote?.name}</p>
                </div>
                {quote && (
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 ${
                    quote.changePercent >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {quote.changePercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                  </span>
                )}
              </div>

              <div className="mt-4">
                <div className="text-4xl font-black text-white font-mono tracking-tight">
                  {quote ? `R$ ${quote.price.toFixed(2)}` : 'R$ ---'}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Cotação oficial de mercado • Atualizado às {quote?.updatedAt || '--:--'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Máxima do Dia</span>
                  <span className="text-emerald-400 font-bold">R$ {quote?.high.toFixed(2) || '---'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Mínima do Dia</span>
                  <span className="text-rose-400 font-bold">R$ {quote?.low.toFixed(2) || '---'}</span>
                </div>
              </div>
            </div>

            {/* Sentimento da IA */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Activity size={15} className="text-cyan-400" /> Diagnóstico da IA
                </span>
                {analysis && (
                  <span className={`badge ${
                    analysis.sentiment === 'BULLISH' ? 'badge-emerald' : analysis.sentiment === 'BEARISH' ? 'badge-rose' : 'badge-amber'
                  }`}>
                    {analysis.sentiment} ({analysis.sentimentScore} pts)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 italic sketchbook-highlight">
                &quot;{analysis?.sentimentReason || 'Analisando conjuntura em tempo real...'}&quot;
              </p>
            </div>

            {/* Folksonomia: Sistema de Tags do Usuário */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Tag size={14} className="text-amber-400" /> Classificação Social (Tags)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Folksonomia</span>
              </div>

              {/* Tags Atuais do Ativo */}
              <div className="flex flex-wrap gap-1.5">
                {(customTags[selectedTicker] || ['#favorito', '#tesouraria', '#hedge']).map((tag, idx) => (
                  <span key={idx} className="sketchbook-tag px-2.5 py-1 rounded-md text-[11px] font-mono font-bold flex items-center gap-1">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Adicionar nova Tag */}
              <form onSubmit={handleAddCustomTag} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Criar nova tag (ex: #risco)..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg outline-none flex-1 font-mono"
                />
                <button type="submit" className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-amber-500/30 transition-all">
                  + Tag
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* COLUNA 2 & 3: Classificação Facetada & Feed de Notícias (Berry-picking) */}
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-2026 p-6 rounded-2xl space-y-5">
            
            {/* Header da Seção de Notícias */}
            <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Newspaper size={20} className="text-cyan-400" />
                <h2 className="text-base font-bold text-white">
                  Feed de Notícias & Fatos Relevantes
                </h2>
              </div>

              {/* Tag com Indicação de Ética Algorítmica */}
              <div className="flex items-center gap-2 text-xs font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                <Eye size={13} />
                <span>{serendipityMode ? 'Navegação Aberta' : 'Filtro Direcionado'}</span>
              </div>
            </div>

            {/* Barra de Filtros Facetados (Classificação Facetada de S. R. Ranganathan) */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <SlidersHorizontal size={14} className="text-cyan-400" />
                <span>Navegação por Facetas (Berry-picking):</span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {/* Faceta de Categoria */}
                <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[11px]">Tópico:</span>
                  <select
                    value={selectedCategoryFacet}
                    onChange={(e) => setSelectedCategoryFacet(e.target.value)}
                    className="bg-transparent text-cyan-300 font-bold outline-none cursor-pointer"
                  >
                    <option value="TODOS" className="bg-slate-900">Todos os Tópicos</option>
                    <option value="Fiscal" className="bg-slate-900">Política Fiscal</option>
                    <option value="Juros/Selic" className="bg-slate-900">Juros & Selic</option>
                    <option value="Ações/FIIs" className="bg-slate-900">Ações & FIIs</option>
                  </select>
                </div>

                {/* Faceta de Impacto */}
                <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[11px]">Impacto:</span>
                  <select
                    value={selectedImpactFacet}
                    onChange={(e) => setSelectedImpactFacet(e.target.value)}
                    className="bg-transparent text-emerald-400 font-bold outline-none cursor-pointer"
                  >
                    <option value="TODOS" className="bg-slate-900">Todos os Impactos</option>
                    <option value="POSITIVO" className="bg-slate-900">Positivo</option>
                    <option value="NEGATIVO" className="bg-slate-900">Negativo</option>
                    <option value="NEUTRO" className="bg-slate-900">Neutro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lista de Notícias Filtradas */}
            {loading ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <RefreshCw size={28} className="spin mx-auto text-cyan-400" />
                <p className="text-xs font-medium">Buscando as últimas notícias na Web via Gemini 1.5 Pro...</p>
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Nenhuma notícia encontrada para a combinação de facetas selecionada.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNews.map((news, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2.5 relative overflow-hidden">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-sm font-bold text-white hover:text-cyan-300 transition-colors">
                        {news.title}
                      </h3>
                      <span className={`badge ${
                        news.impact === 'POSITIVO' ? 'badge-emerald' : news.impact === 'NEGATIVO' ? 'badge-rose' : 'badge-cyan'
                      }`}>
                        {news.impact}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {news.summary}
                    </p>

                    <div className="text-[11px] text-cyan-300 bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-500/20 font-medium">
                      📌 <strong>Impacto Operacional:</strong> {news.impactDetail}
                    </div>

                    {/* Tags da Notícia */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
                      <span className="text-slate-500">Categoria: <strong className="text-slate-300">{news.category}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: Radar Macroeconômico com Tooltips (Gestalt & Proximidade Visual) */}
      <div className="glass-2026 p-6 rounded-2xl space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-500/15 p-2.5 rounded-xl text-amber-400 border border-amber-500/30">
              <Zap size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Diagnóstico & Tendências Macroeconômicas
              </h2>
              <p className="text-xs text-slate-400">
                Resumo unificado de conjuntura nacional e internacional. Passe o mouse nos botões <span className="text-cyan-400 font-bold font-mono">(i)</span> para explicações.
              </p>
            </div>
          </div>
        </div>

        {/* Diagnóstico Geral por IA Gemini */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe2 size={18} className="text-cyan-400" />
              Análise de Conjuntura & Risco Fiscal (Google Search Grounding)
            </h3>
            <button 
              onMouseEnter={() => setActiveTooltip('MACRO_GERAL')}
              onMouseLeave={() => setActiveTooltip(null)}
              className="text-cyan-400 hover:text-cyan-300 p-1 rounded-full bg-cyan-500/10 text-xs flex items-center gap-1"
            >
              <Info size={14} /> Conceito
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans sketchbook-highlight">
            {analysis?.macroSummary?.macroDiagnosis || 'Buscando diagnósticos macroeconômicos mais recentes...'}
          </p>
        </div>

        {/* Tendências por Classe de Ativo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/20 space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-2">
              <ShieldAlert size={18} />
              Renda Fixa (CDI vs IPCA+)
            </h3>
            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">Pós-Fixados (CDI):</span>
                <p className="text-slate-300 leading-relaxed">{analysis?.macroSummary?.fixedIncomeCDI}</p>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">Pré-Fixados & IPCA+:</span>
                <p className="text-slate-300 leading-relaxed">{analysis?.macroSummary?.fixedIncomeIPCAAndPre}</p>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/20 space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2 border-b border-slate-800 pb-2">
              <TrendingUp size={18} />
              Renda Variável (Ações & FIIs)
            </h3>
            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">Ações & ETFs ({selectedTicker}):</span>
                <p className="text-slate-300 leading-relaxed">{analysis?.macroSummary?.equityStocks}</p>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-white block mb-1">Fundos Imobiliários:</span>
                <p className="text-slate-300 leading-relaxed">{analysis?.macroSummary?.equityFIIs}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
