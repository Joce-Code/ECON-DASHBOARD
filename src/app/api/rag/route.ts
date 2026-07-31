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
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ answer: "⚠ Erro de Sistema: Variável GEMINI_API_KEY não configurada no ambiente." }, { status: 500 });
    }

    const prompt = `Você é o Agente de Inteligência Institucional do Focus Tracker. Seu público é focado em Tesouraria Corporativa e Estratégia.
    Responda à pergunta do usuário baseando-se estritamente na base de conhecimento oficial (Ata do Copom) fornecida.
    Base de Conhecimento:
    ${MOCK_KNOWLEDGE_BASE}
    
    Pergunta do Usuário: ${query}
    
    Regra 1: Não alucine informações de fora da base.
    Regra 2: Responda de forma direta e profissional, com foco em impactos (juros, câmbio, custos institucionais).`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
    });

    return NextResponse.json({ answer: response.text });
  } catch (error: any) {
    console.error("RAG Error:", error);
    return NextResponse.json({ answer: "Falha na comunicação com o provedor LLM. Verifique os logs." }, { status: 500 });
  }
}
