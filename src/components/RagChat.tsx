"use client";
import { useState, useEffect } from "react";

export default function RagChat() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [clientApiKey, setClientApiKey] = useState("");

  useEffect(() => {
    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) setClientApiKey(savedKey);
  }, []);

  const saveKey = (key: string) => {
    setClientApiKey(key);
    localStorage.setItem("gemini_api_key", key);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, clientApiKey })
      });
      const data = await res.json();
      setAnswer(data.answer);
    } catch (e) {
      setAnswer("Erro ao conectar com o motor de respostas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-xl space-y-4">
      
      {/* BYOK Settings Toggle */}
      <div className="flex justify-end">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
          title="Configurar Chave de API Própria (Bypass Limites)"
        >
          <span>⚙️</span> API Key
        </button>
      </div>

      {showSettings && (
        <div className="bg-[#090d16] border border-slate-800 p-4 rounded-lg flex flex-col gap-2">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Sua Chave API Gemini (Opcional - Bypass Limite Grátis)
          </label>
          <div className="flex gap-2">
            <input 
              type="password" 
              value={clientApiKey}
              onChange={(e) => saveKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 bg-[#0f172a] border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
            />
            <button 
              onClick={() => { saveKey(""); setShowSettings(false); }}
              className="text-xs text-rose-400 hover:text-rose-300 px-2"
            >
              Limpar
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            Sua chave fica salva apenas no seu navegador (localStorage). Use isso se o servidor estiver sem saldo ou bloqueado pelo Google.
          </p>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-4">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: Qual o tom do BCB sobre desancoragem fiscal na última Ata?"
          className="flex-1 bg-[#090d16] border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500 transition-colors"
        />
        <button 
          type="submit" 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "Pesquisando..." : "Perguntar"}
        </button>
      </form>
      
      {answer && (
        <div className="bg-[#090d16] border-l-2 border-blue-500 p-4 rounded-r-lg text-slate-300 whitespace-pre-wrap">
          {answer}
        </div>
      )}
    </div>
  );
}
