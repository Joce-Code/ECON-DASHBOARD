import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// Inicializando o SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Banco de Conhecimento "Mockado" (MVP do Vector DB)
const MOCK_KNOWLEDGE_BASE = `
Ata do Copom (Resumo Institucional):
O Comitê reforça que o cenário atual demanda cautela e serenidade na condução da política monetária.
Houve menções claras sobre a desancoragem das expectativas de inflação, impulsionadas pela incerteza fiscal.
A taxa Selic deve permanecer contracionista por mais tempo para assegurar a convergência da inflação à meta de 3%.
Aviso Estratégico: Tesourarias e empresas expostas a dívidas atreladas ao CDI devem revisar seus hedges cambiais e de juros para os próximos trimestres.
`;

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ answer: "⚠ Erro de Sistema: Variável GEMINI_API_KEY não configurada no ambiente." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Você é o Agente de Inteligência Institucional do Focus Tracker. Seu público é focado em Tesouraria Corporativa e Estratégia.
    Responda à pergunta do usuário baseando-se estritamente na base de conhecimento oficial (Ata do Copom) fornecida.
    Base de Conhecimento:
    ${MOCK_KNOWLEDGE_BASE}
    
    Pergunta do Usuário: ${query}
    
    Regra 1: Não alucine informações de fora da base.
    Regra 2: Responda de forma direta e profissional, com foco em impactos (juros, câmbio, custos institucionais).`;

    let text = "";
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    
    let lastError: any = null;
    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        if (response.text) {
          text = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        // Se for erro de quota (429), tenta o próximo modelo
        console.warn(`Erro no modelo ${model}:`, err?.message || err);
      }
    }

    // Se conseguiu resposta do LLM
    if (text) {
      return NextResponse.json({ answer: text });
    }

    // Se atingiu o limite de cota 429 da API gratuita em todos os modelos:
    if (lastError && (lastError.status === 429 || JSON.stringify(lastError).includes("429") || JSON.stringify(lastError).includes("RESOURCE_EXHAUSTED"))) {
      const fallbackAnswer = `[Modo de Contingência Institucional - Limite de Cota do Provedor de IA]

Análise da Pergunta: "${query}"

Com base na Ata do Copom e nas DI de mercado:
1. Impacto no Câmbio e Juros: A desancoragem das expectativas inflacionárias e incertezas fiscais mantêm a Selic em patamar contracionista.
2. Diretriz de Tesouraria: Variações em commodities (como petróleo) e dólar elevam o custo de insumos e pressionam o IPCA. Empresas com dívidas atreladas ao CDI ou expostas ao câmbio devem reforçar suas posições de hedge.
3. Recomendação: Reavaliação de derivativos para os próximos trimestres.

(Nota: A cota gratuita da API Gemini do Google foi temporariamente atingida. Tente novamente em alguns segundos.)`;

      return NextResponse.json({ answer: fallbackAnswer });
    }

    return NextResponse.json({ 
      answer: `⚠️ Erro de Comunicação com Provedor de IA: ${lastError?.message || 'Falha na geração'}` 
    }, { status: 500 });
  } catch (error: any) {
    console.error("RAG Fatal Error:", error);
    return NextResponse.json({ answer: "⚠️ Falha temporária no sistema de inteligência. Tente novamente." }, { status: 500 });
  }
}
