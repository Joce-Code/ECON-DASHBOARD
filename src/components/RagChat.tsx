"use client";
import { useState } from "react";

export default function RagChat() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
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
