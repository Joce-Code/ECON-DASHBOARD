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
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      text = response.text || "";
    } catch (modelErr) {
      // Fallback para gemini-2.0-flash caso o modelo 2.5 não esteja liberado na chave
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });
      text = fallbackResponse.text || "";
    }

    return NextResponse.json({ answer: text });
  } catch (error: any) {
    console.error("RAG Error:", error);
    return NextResponse.json({ answer: `Falha na comunicação com o provedor LLM: ${error?.message || 'Erro desconhecido'}` }, { status: 500 });
  }
}
