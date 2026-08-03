"use client";

import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Zap, 
  Bot, 
  Sliders, 
  Key, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  SplitSquareVertical,
  Layers,
  Copy,
  Check
} from "lucide-react";

interface ModelResponse {
  provider: string;
  model: string;
  text?: string;
  error?: string;
  latencyMs?: number;
  usage?: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
  };
  details?: any;
}

const PRESET_PROMPTS = [
  {
    label: "📊 Análise Macroeconômica",
    prompt: "Explique o impacto do aumento da taxa Selic no mercado de crédito corporativo e na inflação de serviços."
  },
  {
    label: "⚡ Teste de Velocidade & Código",
    prompt: "Escreva uma função em TypeScript/React para calcular a média móvel de um array de preços de forma otimizada."
  },
  {
    label: "📦 Saída Estruturada (JSON)",
    prompt: "Retorne um JSON válido com um objeto contendo os campos: 'indicador', 'valor_atual', 'tendencia' (Alta/Baixa/Estável) e 'impacto'."
  },
  {
    label: "🧠 Raciocínio Lógico (Math)",
    prompt: "Se uma carteira render 1,2% ao mês durante 12 meses, qual será o retorno acumulado composto aproximado? Mostre os passos."
  }
];

export default function AiPlaygroundPage() {
  const [provider, setProvider] = useState<"gemini" | "groq" | "compare">("compare");
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash");
  const [groqModel, setGroqModel] = useState("llama-3.3-70b-versatile");
  const [prompt, setPrompt] = useState("Como a taxa de juros afeta o dólar e o mercado de ações no Brasil?");
  const [systemPrompt, setSystemPrompt] = useState("Você é um analista financeiro sênior especializado em mercado brasileiro. Seja claro e conciso.");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(800);
  const [apiKeyOverride, setApiKeyOverride] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [geminiResult, setGeminiResult] = useState<ModelResponse | null>(null);
  const [groqResult, setGroqResult] = useState<ModelResponse | null>(null);
  const [copiedProvider, setCopiedProvider] = useState<string | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem("custom_ai_api_key");
    if (savedKey) setApiKeyOverride(savedKey);
  }, []);

  const handleSaveKey = (key: string) => {
    setApiKeyOverride(key);
    localStorage.setItem("custom_ai_api_key", key);
  };

  const runSingleTest = async (targetProvider: "gemini" | "groq") => {
    const targetModel = targetProvider === "gemini" ? geminiModel : groqModel;
    try {
      const res = await fetch("/api/ai-tester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: targetProvider,
          model: targetModel,
          prompt,
          systemPrompt,
          temperature,
          maxTokens,
          apiKeyOverride
        })
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          provider: targetProvider,
          model: targetModel,
          error: data.error || "Erro desconhecido",
          latencyMs: data.latencyMs,
          details: data.details
        };
      }
      return data;
    } catch (err: any) {
      return {
        provider: targetProvider,
        model: targetModel,
        error: err?.message || "Falha na conexão"
      };
    }
  };

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setGeminiResult(null);
    setGroqResult(null);

    if (provider === "compare") {
      const [gRes, groqRes] = await Promise.all([
        runSingleTest("gemini"),
        runSingleTest("groq")
      ]);
      setGeminiResult(gRes);
      setGroqResult(groqRes);
    } else if (provider === "gemini") {
      const res = await runSingleTest("gemini");
      setGeminiResult(res);
    } else {
      const res = await runSingleTest("groq");
      setGroqResult(res);
    }

    setLoading(false);
  };

  const handleCopyText = (text: string, pName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedProvider(pName);
    setTimeout(() => setCopiedProvider(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header do Playground */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-700/60 rounded-xl text-cyan-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">AI API Playground & Benchmark</h2>
              <p className="text-sm text-slate-400">
                Teste e compare latência, custo e qualidade das APIs do <span className="text-cyan-400 font-medium">Google Gemini</span> e <span className="text-emerald-400 font-medium">Groq (Llama 3.3)</span> em tempo real.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#0d1424] border border-slate-800 p-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => setProvider("compare")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              provider === "compare" 
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/30" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            Comparação Lado a Lado
          </button>
          <button
            type="button"
            onClick={() => setProvider("gemini")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              provider === "gemini" 
                ? "bg-cyan-600 text-white" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Google Gemini
          </button>
          <button
            type="button"
            onClick={() => setProvider("groq")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              provider === "groq" 
                ? "bg-emerald-600 text-white" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Groq (Ultra-Fast)
          </button>
        </div>
      </div>

      {/* Grid Principal: Painel de Controles + Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Painel Lateral: Parâmetros & Chaves (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Configuração de Modelos */}
          <div className="bg-[#0f172a]/90 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Seleção de Modelos
            </h3>

            {(provider === "gemini" || provider === "compare") && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                  <span>Modelo Gemini (Google)</span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded">SDK `@google/genai`</span>
                </label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                >
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Mais Recomendado)</option>
                  <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite (Leve & Rápido)</option>
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Nova Geração)</option>
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash (Alta Precisão)</option>
                  <option value="gemma-4-31b-it">Gemma 4 31B IT (Open Weights)</option>
                </select>
              </div>
            )}

            {(provider === "groq" || provider === "compare") && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                  <span>Modelo Groq</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded">~500 tokens/s</span>
                </label>
                <select
                  value={groqModel}
                  onChange={(e) => setGroqModel(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                >
                  <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile (Meta)</option>
                  <option value="mixtral-8x7b-32768">Mixtral 8x7B (32k Context)</option>
                  <option value="deepseek-r1-distill-llama-70b">DeepSeek R1 Distill 70B (Raciocínio)</option>
                </select>
              </div>
            )}
          </div>

          {/* Sliders de Hiperparâmetros */}
          <div className="bg-[#0f172a]/90 border border-slate-800 p-5 rounded-2xl space-y-4 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Hiperparâmetros
            </h3>

            {/* System Prompt */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">System Prompt (Instrução do Sistema)</label>
              <textarea
                rows={2}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Defina o comportamento do modelo..."
                className="w-full bg-[#090d16] border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:border-cyan-500 outline-none resize-none"
              />
            </div>

            {/* Temperatura */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Temperatura (Criatividade)</span>
                <span className="font-mono text-cyan-400">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.0 (Preciso/Determinístico)</span>
                <span>1.0 (Criativo)</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Max Tokens de Saída</span>
                <span className="font-mono text-cyan-400">{maxTokens}</span>
              </div>
              <input
                type="range"
                min="100"
                max="4000"
                step="100"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Sobrescrita da Chave de API */}
          <div className="bg-[#0f172a]/90 border border-slate-800 p-5 rounded-2xl space-y-3 backdrop-blur-md">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              Chave de API Customizada
            </h3>
            <p className="text-xs text-slate-400">
              Por padrão, o servidor usa as chaves do `.env`. Se quiser testar uma chave própria, digite abaixo:
            </p>
            <input
              type="password"
              value={apiKeyOverride}
              onChange={(e) => handleSaveKey(e.target.value)}
              placeholder="Cole sua API Key (Gemini ou Groq)..."
              className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none font-mono"
            />
            {apiKeyOverride && (
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Chave salva localmente no navegador
              </p>
            )}
          </div>

        </div>

        {/* Área Central do Prompt e Resultados (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Formulário do Prompt */}
          <form onSubmit={handleRunTest} className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" /> Prompt de Teste
              </label>

              <div className="flex gap-2 flex-wrap">
                {PRESET_PROMPTS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(preset.prompt)}
                    className="text-[11px] bg-[#090d16] hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700/80 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Digite o seu prompt para testar a inteligência artificial..."
              className="w-full bg-[#090d16] border border-slate-700/80 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 outline-none transition-colors resize-none font-sans"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium px-8 py-3 rounded-xl shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Executando Chamada de IA...
                  </>
                ) : (
                  <>
                    Executar Teste {provider === "compare" ? "em 2 APIs" : provider.toUpperCase()}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Cards de Resposta dos Modelos */}
          <div className={`grid gap-6 ${provider === "compare" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
            
            {/* Card Gemini */}
            {(provider === "gemini" || provider === "compare") && (
              <div className="bg-[#0f172a] border border-cyan-900/40 rounded-2xl p-5 space-y-4 relative flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="font-semibold text-white text-sm">Google Gemini</span>
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                        {geminiModel}
                      </span>
                    </div>

                    {geminiResult?.latencyMs && (
                      <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        {geminiResult.latencyMs} ms
                      </span>
                    )}
                  </div>

                  {loading && !geminiResult && (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                      <span className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                      <span className="text-xs">Aguardando resposta do servidor do Google...</span>
                    </div>
                  )}

                  {geminiResult?.error && (
                    <div className="bg-rose-950/40 border border-rose-800/60 p-4 rounded-xl space-y-2 text-rose-300 text-xs">
                      <div className="flex items-center gap-2 font-semibold text-rose-400">
                        <AlertCircle className="w-4 h-4" />
                        Erro na resposta da API Gemini
                      </div>
                      <p>{geminiResult.error}</p>
                      {geminiResult.error.includes("RESOURCE_EXHAUSTED") && (
                        <p className="text-[11px] text-rose-300/80 pt-1 border-t border-rose-800/40">
                          💡 <strong>Dica de Quota:</strong> O código de erro 429 indica que esta chave do Gemini precisa ter faturamento ativado no Google AI Studio ou alterar para o modelo <code className="bg-rose-900/50 px-1 py-0.5 rounded">gemini-2.0-flash</code>.
                        </p>
                      )}
                    </div>
                  )}

                  {geminiResult?.text && (
                    <div className="space-y-3">
                      <div className="bg-[#090d16] border border-slate-800 p-4 rounded-xl text-slate-200 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto font-sans">
                        {geminiResult.text}
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                        <span>
                          {geminiResult.usage?.totalTokens ? (
                            <>Tokens: <strong className="text-cyan-400">{geminiResult.usage.totalTokens}</strong> ({geminiResult.usage.promptTokens} prompt + {geminiResult.usage.candidatesTokens} resposta)</>
                          ) : (
                            "Resposta gerada com sucesso"
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(geminiResult.text || "", "gemini")}
                          className="hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {copiedProvider === "gemini" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedProvider === "gemini" ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                    </div>
                  )}

                  {!loading && !geminiResult && (
                    <div className="py-12 text-center text-slate-600 text-xs">
                      Clique em "Executar Teste" para ver o resultado do modelo Gemini.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Card Groq */}
            {(provider === "groq" || provider === "compare") && (
              <div className="bg-[#0f172a] border border-emerald-900/40 rounded-2xl p-5 space-y-4 relative flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold text-white text-sm">Groq Llama</span>
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                        {groqModel}
                      </span>
                    </div>

                    {groqResult?.latencyMs && (
                      <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        {groqResult.latencyMs} ms
                      </span>
                    )}
                  </div>

                  {loading && !groqResult && (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                      <span className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                      <span className="text-xs">Aguardando resposta da infraestrutura Groq LPUs...</span>
                    </div>
                  )}

                  {groqResult?.error && (
                    <div className="bg-rose-950/40 border border-rose-800/60 p-4 rounded-xl space-y-2 text-rose-300 text-xs">
                      <div className="flex items-center gap-2 font-semibold text-rose-400">
                        <AlertCircle className="w-4 h-4" />
                        Erro na resposta da API Groq
                      </div>
                      <p>{groqResult.error}</p>
                    </div>
                  )}

                  {groqResult?.text && (
                    <div className="space-y-3">
                      <div className="bg-[#090d16] border border-slate-800 p-4 rounded-xl text-slate-200 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto font-sans">
                        {groqResult.text}
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                        <span>
                          {groqResult.usage?.totalTokens ? (
                            <>Tokens: <strong className="text-emerald-400">{groqResult.usage.totalTokens}</strong> ({groqResult.usage.promptTokens} prompt + {groqResult.usage.candidatesTokens} resposta)</>
                          ) : (
                            "Resposta gerada com velocidade ultra-rápida"
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(groqResult.text || "", "groq")}
                          className="hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {copiedProvider === "groq" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedProvider === "groq" ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                    </div>
                  )}

                  {!loading && !groqResult && (
                    <div className="py-12 text-center text-slate-600 text-xs">
                      Clique em "Executar Teste" para ver o resultado da API Groq.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
