import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { 
      provider, 
      model, 
      prompt, 
      systemPrompt, 
      temperature = 0.7, 
      maxTokens = 1000,
      apiKeyOverride 
    } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "O prompt não pode estar vazio." }, { status: 400 });
    }

    if (provider === 'gemini') {
      const apiKey = apiKeyOverride?.trim() || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "Chave da API do Gemini não configurada." }, { status: 400 });
      }

      const targetModel = model || 'gemini-2.0-flash';
      
      // Tentar via Endpoint REST Oficial do Google Generative Language API
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: Number(temperature),
            maxOutputTokens: Number(maxTokens)
          }
        })
      });

      const data = await res.json();
      const endTime = Date.now();
      const latencyMs = endTime - startTime;

      if (!res.ok) {
        return NextResponse.json({
          error: data.error?.message || `Erro na API Gemini (${res.status})`,
          details: data,
          latencyMs
        }, { status: res.status });
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta do modelo.";
      const usage = data?.usageMetadata || null;

      return NextResponse.json({
        provider: 'gemini',
        model: targetModel,
        text,
        latencyMs,
        usage: usage ? {
          promptTokens: usage.promptTokenCount,
          candidatesTokens: usage.candidatesTokenCount,
          totalTokens: usage.totalTokenCount
        } : null
      });
    }

    if (provider === 'groq') {
      const apiKey = apiKeyOverride?.trim() || process.env.GROQ_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "Chave da API do Groq não configurada." }, { status: 400 });
      }

      const targetModel = model || 'llama-3.3-70b-versatile';
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content: prompt });

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: targetModel,
          messages,
          temperature: Number(temperature),
          max_tokens: Number(maxTokens)
        })
      });

      const data = await res.json();
      const endTime = Date.now();
      const latencyMs = endTime - startTime;

      if (!res.ok) {
        return NextResponse.json({
          error: data.error?.message || `Erro na API Groq (${res.status})`,
          details: data,
          latencyMs
        }, { status: res.status });
      }

      const text = data?.choices?.[0]?.message?.content || "Sem resposta do modelo.";
      const usage = data?.usage || null;

      return NextResponse.json({
        provider: 'groq',
        model: targetModel,
        text,
        latencyMs,
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          candidatesTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        } : null
      });
    }
    if (provider === 'openrouter') {
      const apiKey = apiKeyOverride?.trim() || process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "Chave da API do OpenRouter não configurada. Digite uma chave grátis do openrouter.ai na tela ou no .env." }, { status: 400 });
      }

      const targetModel = model || 'deepseek/deepseek-r1:free';
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content: prompt });

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Focus Tracker AI Playground"
        },
        body: JSON.stringify({
          model: targetModel,
          messages,
          temperature: Number(temperature),
          max_tokens: Number(maxTokens)
        })
      });

      const data = await res.json();
      const endTime = Date.now();
      const latencyMs = endTime - startTime;

      if (!res.ok) {
        return NextResponse.json({
          error: data.error?.message || `Erro na API OpenRouter (${res.status})`,
          details: data,
          latencyMs
        }, { status: res.status });
      }

      const text = data?.choices?.[0]?.message?.content || "Sem resposta do modelo.";
      const usage = data?.usage || null;

      return NextResponse.json({
        provider: 'openrouter',
        model: targetModel,
        text,
        latencyMs,
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          candidatesTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        } : null
      });
    }

    return NextResponse.json({ error: `Provedor desconhecido: ${provider}` }, { status: 400 });

  } catch (error: any) {
    const endTime = Date.now();
    return NextResponse.json({
      error: error?.message || "Erro interno no servidor ao processar chamada de IA.",
      latencyMs: endTime - startTime
    }, { status: 500 });
  }
}
