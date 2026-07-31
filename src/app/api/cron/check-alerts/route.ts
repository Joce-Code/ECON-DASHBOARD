import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { getGoldKPIs } from '@/lib/data-pipeline/aggregators';

export const dynamic = 'force-dynamic'; // Garante que essa rota não seja cacheadada no build

export async function GET(req: Request) {
  // Instanciando dentro do handler para evitar falha no Build da Vercel
  const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy'
  );

  // Segurança básica para evitar acesso indevido à rota de Cron
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } // Descomentar em prod quando tiver a secret da Vercel

  try {
    const kpis = await getGoldKPIs();
    if (kpis.error) throw new Error('Data pipeline falhou, abortando alertas para não gerar falso positivos.');

    const currentIpca = Number(kpis.ipca?.valor);
    const currentSelic = Number(kpis.selic?.valor);

    // Buscar todas as regras ativas no banco
    const { data: rules, error: dbError } = await supabase.from('alert_rules').select('*');
    if (dbError) throw dbError;

    let sentCount = 0;

    if (rules && rules.length > 0) {
      for (const rule of rules) {
        let isTriggered = false;
        let triggeredValue = 0;

        if (rule.indicator === 'IPCA') {
          triggeredValue = currentIpca;
          if (rule.condition === '>' && currentIpca > rule.threshold) isTriggered = true;
          if (rule.condition === '<' && currentIpca < rule.threshold) isTriggered = true;
        }
        
        if (rule.indicator === 'Selic') {
          triggeredValue = currentSelic;
          if (rule.condition === '>' && currentSelic > rule.threshold) isTriggered = true;
          if (rule.condition === '<' && currentSelic < rule.threshold) isTriggered = true;
        }

        if (isTriggered) {
          // Disparo de E-mail via Resend
          await resend.emails.send({
            from: 'Focus Tracker <onboarding@resend.dev>', // E-mail padrão de dev do Resend
            to: rule.email_target,
            subject: `⚠ ALERTA INSTITUCIONAL: ${rule.indicator} rompeu limite`,
            html: `
              <h2>Atenção à Tesouraria</h2>
              <p>O indicador econômico <strong>${rule.indicator}</strong> rompeu os limites de controle do portfólio.</p>
              <ul>
                <li><strong>Valor Atual (SGS/BCB):</strong> ${triggeredValue}</li>
                <li><strong>Limite Configurado:</strong> ${rule.condition} ${rule.threshold}</li>
              </ul>
              <p>Recomendamos a revisão imediata dos modelos de precificação de dívida (CDI).</p>
            `
          });
          sentCount++;
        }
      }
    }

    return NextResponse.json({ success: true, active_rules: rules?.length || 0, alerts_sent: sentCount });
  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
