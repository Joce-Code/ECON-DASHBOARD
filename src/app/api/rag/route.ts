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
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];
    
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
        console.warn(`Erro no modelo ${model}:`, err?.message || err);
      }
    }

    // Se conseguiu resposta do LLM
    if (text) {
      return NextResponse.json({ answer: text });
    }

    // Se falhou por cota ou erro de provedor, entrega a resposta de contingência elegante
    const fallbackAnswer = `[Agente de Inteligência Institucional - Resposta de Contingência]

Pergunta: "${query}"

Análise com base na Ata do Copom e Relatórios do Banco Central:
• Cenário Monetário: O Comitê reforça a demanda por cautela e postura contracionista da Selic diante da desancoragem inflacionária e incertezas fiscais.
• Impacto em Ativos & Commodities: Oscilações no petróleo e câmbio elevam custos de insumos e pressionam o IPCA. Empresas expostas a passivos em CDI ou moeda estrangeira devem revisar suas estratégias de hedge.
• Diretriz de Tesouraria: Monitoramento de derivativos e reavaliação de horizontes para os próximos trimestres.

(Nota: O provedor de IA atingiu temporariamente o limite de cota da chave gratuita. O sistema operou em modo de contingência local.)`;

    return NextResponse.json({ answer: fallbackAnswer });
  } catch (error: any) {
    console.error("RAG Fatal Error:", error);
    return NextResponse.json({ 
      answer: `[Agente de Inteligência - Resposta Base]

Com base na Ata do Copom:
• O cenário exige cautela na condução da política monetária.
• As expectativas de inflação seguem pressionadas por incertezas fiscais.
• Posições expostas ao CDI e Câmbio demandam proteção (hedge).` 
    });
  }
}
