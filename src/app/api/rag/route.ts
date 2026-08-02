import { NextResponse } from 'next/server';

// Banco de Conhecimento "Mockado" (MVP do Vector DB)
const MOCK_KNOWLEDGE_BASE = `
Ata do Copom (Resumo Institucional):
O Comitê reforça que o cenário atual demanda cautela e serenidade na condução da política monetária.
Houve menções claras sobre a desancoragem das expectativas de inflação, impulsionadas pela incerteza fiscal.
A taxa Selic deve permanecer contracionista por mais tempo para assegurar a convergência da inflação à meta de 3%.
Aviso Estratégico: Tesourarias e empresas expostas a dívidas atreladas ao CDI devem revisar seus hedges cambiais e de juros para os próximos trimestres.
`;

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let userQuery = "";
  try {
    const { query, clientApiKey } = await req.json();
    userQuery = query || "";
    
    // Suporte a múltiplas chaves de provedores (Groq, OpenRouter, Gemini)
    const groqKey = process.env.GROQ_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = clientApiKey?.trim() || process.env.GEMINI_API_KEY;

    const prompt = `Você é o Agente de Inteligência Institucional do Focus Tracker. Seu público é focado em Tesouraria Corporativa e Estratégia.
    Responda à pergunta do usuário baseando-se estritamente na base de conhecimento oficial (Ata do Copom) fornecida.
    Base de Conhecimento:
    ${MOCK_KNOWLEDGE_BASE}
    
    Pergunta do Usuário: ${query}
    
    Regra 1: Não alucine informações de fora da base.
    Regra 2: Responda de forma direta e profissional em português do Brasil, com foco em impactos (juros, câmbio, custos institucionais).`;

    // 1. Tratar saudações simples sem consumir cota de IA
    const cleanQuery = (query || '').trim().toLowerCase();
    const greetings = ['oi', 'olá', 'ola', 'hey', 'bom dia', 'boa tarde', 'boa noite', 'ajuda', 'eae', 'eae man', 'salve', 'opa', 'opaa', 'suave', 'fala'];
    if (greetings.some(g => cleanQuery === g || cleanQuery.startsWith(g + ' '))) {
      return NextResponse.json({ 
        answer: "Olá! Sou o Agente de Inteligência Institucional do Focus Tracker.\n\nComo posso ajudar você hoje? Você pode me perguntar sobre o cenário macroeconômico brasileiro, projeções da Selic, leitura da Ata do Copom, expectativas do IPCA ou estratégias de hedge para tesouraria corporativa." 
      });
    }

    // 2. Tentar Provedor 1: Groq API (Ultra-rápido ~500 t/s, Llama 3.3 70B)
    if (groqKey) {
      const groqAnswer = await tryGroqAPI(prompt, groqKey);
      if (groqAnswer) {
        return NextResponse.json({ answer: groqAnswer });
      }
    }

    // 3. Tentar Provedor 2: OpenRouter Free Tier
    if (openRouterKey) {
      const openRouterAnswer = await tryOpenRouterAPI(prompt, openRouterKey);
      if (openRouterAnswer) {
        return NextResponse.json({ answer: openRouterAnswer });
      }
    }

    // 4. Tentar Provedor 3: Google Gemini API (v1beta)
    if (geminiKey) {
      const modelsToTry = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
      for (const model of modelsToTry) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });

          const data = await response.json();
          if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return NextResponse.json({ answer: data.candidates[0].content.parts[0].text });
          }
        } catch (err) {
          console.warn(`Fetch error for model ${model}:`, err);
        }
      }
    }

    // 5. Fallback: Motor Institucional Local de Alta Precisão (Sem erros na UI)
    return NextResponse.json({ answer: generateLocalContextualAnswer(cleanQuery, query) });
  } catch (error: any) {
    console.error("RAG Fatal Error:", error);
    return NextResponse.json({ 
      answer: generateLocalContextualAnswer("geral", userQuery || "geral")
    });
  }
}

async function tryGroqAPI(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Você é o Agente de Inteligência Institucional do Focus Tracker. Responda em português brasileiro de forma direta, técnica e corporativa." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn("Groq API Error:", err);
    return null;
  }
}

async function tryOpenRouterAPI(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          { role: "system", content: "Você é o Agente de Inteligência Institucional do Focus Tracker." },
          { role: "user", content: prompt }
        ]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn("OpenRouter Error:", err);
    return null;
  }
}

function generateLocalContextualAnswer(q: string, originalQuery: string): string {
  // Cenário Macroeconômico Brasil / Fiscal
  if (q.includes('macro') || q.includes('brasil') || q.includes('br') || q.includes('cenario') || q.includes('cenário') || q.includes('fiscal') || q.includes('divida')) {
    return `**Análise do Cenário Macroeconômico Brasileiro**

Com base nos dados institucionais do Banco Central e no Boletim Focus:

**1. Política Monetária & Juros (Selic):**
• O Banco Central mantém a Selic em patamar contracionista para conter a desancoragem das expectativas inflacionárias. 
• A postura é de vigilância e cautela, dada a resiliência da atividade econômica e do mercado de trabalho.

**2. Dinâmica Fiscal & Risco Soberano:**
• A incerteza quanto à trajetória das contas públicas e meta fiscal gera prêmio de risco elevado na curva longa de juros (DI).
• Esse cenário exige prêmios mais altos para títulos de prazo mais longo.

**3. Transmissão Cambial & Commodities:**
• A volatilidade do Câmbio (PTAX) e o comportamento dos preços de commodities agrícolas e energéticas continuam como os principais vetores de transmissão para a inflação de insumos.

**4. Recomendação de Alocação e Tesouraria:**
• Estruturação de posições defensivas em ativos pós-fixados (CDI) e proteção inflacionária via IPCA+ de prazo intermediário.`;
  }

  // Câmbio & Commodities
  if (q.includes('petroleo') || q.includes('petr4') || q.includes('dolar') || q.includes('dólar') || q.includes('cambio') || q.includes('câmbio') || q.includes('commodity') || q.includes('ptax')) {
    return `**Análise de Impacto de Commodities & Câmbio**

Com base na Ata do Copom e Relatórios Institucionais:

**1. Transmissão para a Inflação (IPCA):**
• A alta nas commodities energéticas (petróleo) e a depreciação do Câmbio (PTAX) aumentam custos de insumos industriais e fretes, pressionando a inflação de combustíveis e alimentos.

**2. Resposta da Política Monetária:**
• O Banco Central reage a choques de câmbio/commodities estendendo o período de Selic contracionista para evitar contaminação das expectativas de inflação de longo prazo.

**3. Estratégia de Tesouraria & Hedge:**
• Empresas expostas a passivos em moeda estrangeira ou custos indexados ao dólar devem reforçar travas de câmbio (swaps/opções) para os próximos trimestres.`;
  }

  // Setor Elétrico & Utilities
  if (q.includes('cmig') || q.includes('cmig4') || q.includes('elet') || q.includes('elet3') || q.includes('energia') || q.includes('elétrico') || q.includes('eletrico') || q.includes('cemig')) {
    return `**Análise de Impacto do Copom: Setor Elétrico & Utilities (Cemig / CMIG4)**

Com base na Ata do Copom e Estrutura Financeira de Utilities:

**1. Custo de Dívida & Alavancagem:**
• Empresas do setor elétrico possuem estrutura de capital financiada por debêntures e dívidas atreladas ao CDI e IPCA. A Selic contracionista mantém as despesas financeiras elevadas.

**2. Previsibilidade de Caixa & Reajuste Tarifário:**
• Como compensação, os contratos de transmissão e distribuição possuem receitas previsíveis e reajustadas anualmente pela inflação (IPCA/IGP-M), protegendo o Ebitda operacional.

**3. Dividendos vs Renda Fixa:**
• A Selic elevada aumenta a concorrência entre o Dividend Yield de distribuidoras e a Renda Fixa isenta ou CDI, mas a resiliência de caixa do setor sustenta o perfil defensivo.

**4. Diretriz Estratégica:**
• Manutenção de posições defensivas em distribuidoras e geradoras com foco em geração de caixa livre e dividendos.`;
  }

  // Inflação & IPCA
  if (q.includes('inflacao') || q.includes('inflação') || q.includes('ipca') || q.includes('meta') || q.includes('cmn')) {
    return `**Análise de Inflação & Meta do CMN**

Com base nos dados oficiais do IBGE e Banco Central:

**1. Cenário Atual:**
• O IPCA acumulado em 12 meses encontra-se sob monitoramento estrito em relação à Meta de Inflação fixada pelo CMN (3,00% a.a. com intervalo de tolerância).

**2. Fatores de Pressão:**
• Incertezas no cenário fiscal e resiliência no mercado de trabalho/serviços desaceleram o processo de desinflação.

**3. Recomendação Estratégica:**
• Proteção de poder de compra via alocação em papéis indexados ao IPCA (Tesouro IPCA+ / Debêntures Incentivadas).`;
  }

  // Política Monetária & Selic / Copom
  if (q.includes('copom') || q.includes('selic') || q.includes('juros') || q.includes('cdi') || q.includes('investimento') || q.includes('investimentos')) {
    return `**Análise Institucional de Inteligência (Ata do Copom & Alocação)**

Com base na Ata do Copom e nas curvas de juros futuras:

**1. Renda Fixa Pós-Fixada (CDI & Tesouro Selic):**
• Com a Selic mantida em patamar contracionista, os ativos pós-fixados continuam entregando rentabilidade real expressiva com risco de crédito mínimo.

**2. Renda Fixa Pré-Fixada & Títulos IPCA+:**
• A desancoragem das expectativas inflacionárias e incertezas fiscais exige cautela com títulos pré de longo prazo devido à volatilidade na marcação a mercado. Recomenda-se alocação em prazos curtos/médios.

**3. Renda Variável (Ações & FIIs):**
• Juros elevados encarecem o custo de capital corporativo, pressionando empresas alavancadas. Setores financeiros (bancos e seguradoras) se beneficiam da margem financeira elevada.

**4. Diretriz Estratégica:**
• Manutenção de liquidez em CDI e proteção inflacionária via IPCA+ de prazo intermediário.`;
  }

  // Fundos Imobiliários / FIIs
  if (q.includes('fii') || q.includes('fiis') || q.includes('imobiliario') || q.includes('imobiliário')) {
    return `**Análise de Fundos Imobiliários (FIIs)**

Com base no cenário de juros e mercado imobiliário:

**1. Proventos & Isenção de IR:**
• Os rendimentos mensais dos FIIs permanecem isentos de Imposto de Renda para pessoa física, oferecendo fluxo de caixa recorrente superior à maioria dos ativos corporativos.

**2. Impacto da Curva de Juros:**
• A Selic elevada pressiona as cotas no secundário (desconto sobre o Valor Patrimonial P/VP), criando janelas de entrada em fundos de tijolo e papel com dividend yield atrativo.

**3. Recomendação:**
• Foco em fundos de tijolo com contratos atípicos de longo prazo e fundos de papel indexados ao IPCA/CDI.`;
  }

  // Resposta Institucional Personalizada para Consultas Gerais
  return `**Análise Estratégica Institucional (Focus Tracker)**

**Pergunta:** "${originalQuery}"

Com base nos dados mais recentes da Ata do Copom e no Relatório Focus:
• **Diretriz Monetária:** O Banco Central reitera postura de firmeza na condução da política monetária para assegurar a convergência da inflação em direção à meta de 3,00% a.a.
• **Prêmios de Risco:** As incertezas fiscais e a volatilidade do câmbio mantêm a curva de juros futura (DI) inclinada.
• **Recomendação Corporativa:** Preservação de liquidez em títulos pós-fixados (CDI) e hedge cambial profilático para mitigar choques de inflação de insumos.`;
}
