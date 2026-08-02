import { SimulationResult, TradeoffScore, InvestorProfile, InvestmentGoal } from '@/domain/types';

export function evaluateTradeoff(
  result: SimulationResult,
  profile: InvestorProfile,
  goal: InvestmentGoal
): TradeoffScore {
  const { asset, realYieldAnnualizedPercent, nominalYieldPercent } = result;

  // 1. Liquidity Score (0 - 100)
  // D+0 = 100, D+1 = 90, D+2 = 80, D+90 = 40, D+1080 = 10
  let liquidityScore = 100;
  if (asset.liquidityDays === 0) liquidityScore = 100;
  else if (asset.liquidityDays <= 1) liquidityScore = 90;
  else if (asset.liquidityDays <= 3) liquidityScore = 80;
  else if (asset.liquidityDays <= 90) liquidityScore = 40;
  else liquidityScore = 20;

  // 2. Risk Score (0 - 100) -> 100 = maior risco
  let riskScore = 10;
  if (asset.volatilityRating === 'BAIXA') riskScore = 15;
  else if (asset.volatilityRating === 'MEDIA') riskScore = 45;
  else if (asset.volatilityRating === 'ALTA') riskScore = 80;
  else riskScore = 95;

  // 3. Return Score (0 - 100) baseado no rendimento real a.a.
  // 0% real = 20 pts, 4% real = 60 pts, 8% real+ = 95 pts
  const returnScore = Math.min(100, Math.max(10, Math.round(50 + realYieldAnnualizedPercent * 6)));

  // 4. Suitability Score & Badges
  let suitabilityScore = 50;
  let suitabilityBadge: TradeoffScore['suitabilityBadge'] = 'ADEQUADO';
  let recommendationReason = '';

  if (goal === 'RESERVA_EMERGENCIA') {
    if (asset.liquidityDays <= 1 && asset.volatilityRating === 'BAIXA') {
      suitabilityScore = 98;
      suitabilityBadge = 'ALTAMENTE_RECOMENDADO';
      recommendationReason = 'Excelente para Reserva de Emergência: alta liquidez e baixíssima volatilidade de capital.';
    } else if (asset.volatilityRating === 'BAIXA') {
      suitabilityScore = 70;
      suitabilityBadge = 'ADEQUADO';
      recommendationReason = 'Rendimento seguro, porém atente-se ao prazo de resgate ou carência.';
    } else {
      suitabilityScore = 25;
      suitabilityBadge = 'NAO_RECOMENDADO';
      recommendationReason = 'Inadequado para reserva imediata devido à oscilação de preços de mercado e menor liquidez.';
    }
  } else if (goal === 'RENDA_PASSIVA') {
    if (asset.category === 'FIIS') {
      suitabilityScore = 95;
      suitabilityBadge = 'ALTAMENTE_RECOMENDADO';
      recommendationReason = 'Ideal para geração de fluxo de caixa recorrente com proventos mensais isentos de IR.';
    } else if (asset.category === 'RENDA_FIXA_CDB' || asset.category === 'RENDA_FIXA_ISENTO' || asset.category === 'TESOURO_DIRETO') {
      suitabilityScore = 80;
      suitabilityBadge = 'ADEQUADO';
      recommendationReason = 'Gera fluxo líquido constante através da taxa real de juros sem volatilidade extrema.';
    } else {
      suitabilityScore = 65;
      suitabilityBadge = 'ATENCAO';
      recommendationReason = 'Focado em crescimento de capital; a renda mensal pode oscilar conforme dividendos das empresas.';
    }
  } else {
    // ACUMULACAO_APOSENTADORIA
    if (profile === 'CONSERVADOR') {
      if (asset.category === 'TESOURO_DIRETO' || asset.category === 'RENDA_FIXA_ISENTO' || asset.category === 'RENDA_FIXA_CDB') {
        suitabilityScore = 90;
        suitabilityBadge = 'ALTAMENTE_RECOMENDADO';
        recommendationReason = 'Proteção de capital no longo prazo com juros compostos sólidos e segurança.';
      } else {
        suitabilityScore = 55;
        suitabilityBadge = 'ATENCAO';
        recommendationReason = 'Proporciona retornos reais elevados, mas exige estômago para oscilações no perfil conservador.';
      }
    } else if (profile === 'MODERADO') {
      if (asset.category === 'TESOURO_DIRETO' || asset.category === 'FIIS' || asset.category === 'RENDA_FIXA_CDB') {
        suitabilityScore = 92;
        suitabilityBadge = 'ALTAMENTE_RECOMENDADO';
        recommendationReason = 'Equilíbrio ideal entre crescimento, proteção de inflação e renda recorrente.';
      } else {
        suitabilityScore = 85;
        suitabilityBadge = 'ADEQUADO';
        recommendationReason = 'Boa opção para acelerar o patrimônio real assumindo volatilidade moderada.';
      }
    } else {
      // ARROJADO
      if (asset.category === 'ACOES' || asset.category === 'FIIS' || asset.id.includes('ipca')) {
        suitabilityScore = 96;
        suitabilityBadge = 'ALTAMENTE_RECOMENDADO';
        recommendationReason = 'Maximiza o potencial de ganho real e acumulação de longo prazo no perfil arrojado.';
      } else {
        suitabilityScore = 75;
        suitabilityBadge = 'ADEQUADO';
        recommendationReason = 'Ativo seguro e estável, porém pode limitar o ganho máximo no longo prazo.';
      }
    }
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    liquidityScore,
    riskScore,
    returnScore,
    suitabilityScore,
    suitabilityBadge,
    recommendationReason,
  };
}
