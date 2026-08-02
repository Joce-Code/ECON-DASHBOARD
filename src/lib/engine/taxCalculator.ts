import { AssetTaxRules } from '@/domain/types';

/**
 * Retorna a alíquota regressiva de Imposto de Renda (em decimal) baseada no número de dias de aplicação.
 * Tabela Regressiva de Renda Fixa:
 * - Até 180 dias: 22,5%
 * - De 181 a 360 dias: 20,0%
 * - De 361 a 720 dias: 17,5%
 * - Acima de 720 dias: 15,0%
 */
export function getRfTaxRateByDays(days: number): number {
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.20;
  if (days <= 720) return 0.175;
  return 0.15;
}

/**
 * Calcula a alíquota efetiva de IR sobre o ganho de capital do ativo baseando-se no prazo em meses.
 */
export function calculateIncomeTaxRate(taxRules: AssetTaxRules, months: number): number {
  switch (taxRules.taxType) {
    case 'ISENTO':
      return 0;
    case 'REGRESSIVA_RF': {
      const approxDays = Math.round(months * 30);
      return getRfTaxRateByDays(approxDays);
    }
    case 'ACOES_SWING':
      return 0.15; // 15% sobre o ganho de capital
    case 'FIIS':
      return 0.20; // 20% sobre o ganho de capital na alienação das cotas
    default:
      return 0.15;
  }
}

/**
 * Calcula a taxa de custódia da B3 pro-rata mensal.
 * Tesouro Selic: isenção até R$ 10.000,00. 0,20% a.a. sobre o excedente.
 */
export function calculateMonthlyB3Fee(
  assetId: string,
  currentGrossAmount: number,
  yearlyFeeRate: number
): number {
  if (yearlyFeeRate <= 0) return 0;

  let taxableBase = currentGrossAmount;
  // Isenção de custódia B3 de até R$ 10.000 para Tesouro Selic
  if (assetId.includes('tesouro-selic')) {
    taxableBase = Math.max(0, currentGrossAmount - 10000);
  }

  const monthlyRate = Math.pow(1 + yearlyFeeRate, 1 / 12) - 1;
  return taxableBase * monthlyRate;
}
