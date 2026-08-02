import { AssetPreset, SWOTItem } from '@/domain/types';

export function generateSWOTForAsset(
  asset: AssetPreset,
  selicRateYearly: number,
  ipcaRateYearly: number
): SWOTItem {
  const selicPercent = (selicRateYearly * 100).toFixed(1);
  const ipcaPercent = (ipcaRateYearly * 100).toFixed(1);
  const isHighSelic = selicRateYearly >= 0.09; // Selic >= 9%

  switch (asset.category) {
    case 'RENDA_FIXA_CDB':
    case 'RENDA_FIXA_ISENTO':
      return {
        strengths: [
          'Proteção FGC até R$ 250.000 por CPF/instituição',
          'Baixa volatilidade e previsibilidade de rendimento',
          asset.category === 'RENDA_FIXA_ISENTO' ? 'Isenção total de Imposto de Renda' : 'Tabela regressiva reduz IR para 15% após 2 anos',
        ],
        opportunities: [
          isHighSelic
            ? `Captura rentabilidade nominal expressiva com Selic a ${selicPercent}% a.a.`
            : 'Oportunidade de travamento de taxas pré/pós fixadas atrativas',
          'Aportes recorrentes reduzem o risco de timing de mercado',
        ],
        weaknesses: [
          asset.category === 'RENDA_FIXA_CDB' ? 'Tabela regressiva incide alíquota de 22,5% em liquidações antecipadas' : 'Período de carência de liquidez (ex: 90 dias)',
          'Risco de crédito bancário do emissor em instituições de médio porte',
        ],
        threats: [
          `Queda acentuada da taxa Selic reduz o retorno líquido absoluto`,
          `Surto inflacionário acima de ${ipcaPercent}% comprime a taxa real de juros`,
        ],
      };

    case 'TESOURO_DIRETO':
      return {
        strengths: [
          'Menor risco de crédito da economia brasileira (Risco Soberano)',
          'Liquidez diária garantida pelo Tesouro Nacional (D+0/D+1)',
          asset.id.includes('ipca') ? 'Proteção direta do poder de compra via indexação oficial ao IPCA' : 'Acompanhamento automático da taxa básica de juros',
        ],
        opportunities: [
          asset.id.includes('ipca')
            ? 'Ganho de capital adicional via Marcação a Mercado em ciclos de queda de juros'
            : `Rendimento de alta liquidez ideal para Reserva de Emergência com Selic a ${selicPercent}% a.a.`,
          'Aporte indexado garante preservação patrimonial no longo prazo',
        ],
        weaknesses: [
          'Cobrança da taxa de custódia B3 de 0,20% a.a.',
          asset.id.includes('ipca') ? 'Alta oscilação de preço no curto prazo por conta da Marcação a Mercado' : 'Não possui isenção de IR',
        ],
        threats: [
          'Risco fiscal do governo federal impactando as curvas de juros futuros',
          'Elevação repentina dos juros futuros pode causar desvalorização temporária nos títulos longos',
        ],
      };

    case 'FIIS':
      return {
        strengths: [
          'Renda mensal de dividendos 100% isenta de IR para Pessoa Física',
          'Exposição simplificada ao mercado imobiliário físico de alto padrão',
          'Recomposição periódica dos aluguéis pelo IGPM/IPCA',
        ],
        opportunities: [
          'Reinvestimento automático dos dividendos mensais acelera o efeito dos juros compostos',
          'Descontos em relação ao Valor Patrimonial (P/VP < 1.0) geram margem de segurança',
        ],
        weaknesses: [
          'Sensibilidade direta da cota à variação dos juros futuros e curva de juros longa',
          'Alíquota de 20% de IR sobre eventual ganho de capital na alienação de cotas',
        ],
        threats: [
          'Risco de vacância física/financeira e inadimplência de inquilinos corporativos',
          'Risco regulatório de tributação sobre os dividendos de FIIs em reformas tributárias',
        ],
      };

    case 'ACOES':
      return {
        strengths: [
          'Proteção contra inflação através do repasse de custos das empresas ao consumidor final',
          'Potencial ilimitado de valorização e crescimento dos lucros corporativos',
          'Dolarização da carteira (no caso do IVVB11 / S&P 500)',
        ],
        opportunities: [
          'Comprar em momentos de volatilidade com múltiplos atrativos de Valuation',
          'Isenção de IR para vendas de ações locais até R$ 20.000 por mês',
        ],
        weaknesses: [
          'Elevada volatilidade diária de mercado (risco de cotação)',
          'Exige maior tolerância psicológica a drawdowns de curto prazo',
        ],
        threats: [
          'Recessões globais, choques geopolíticos e aumento de juros internacionais',
          'Riscos regulatórios e setoriais específicos de cada companhia',
        ],
      };

    default:
      return {
        strengths: ['Ativo diversificado'],
        opportunities: ['Geração de valor no longo prazo'],
        weaknesses: ['Sujeito a oscilações de mercado'],
        threats: ['Cenário macroeconômico adverso'],
      };
  }
}
