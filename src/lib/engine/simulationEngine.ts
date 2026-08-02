import { AssetPreset, MonthlyBreakdown, SimulationInput, SimulationResult } from '@/domain/types';
import { calculateIncomeTaxRate, calculateMonthlyB3Fee } from './taxCalculator';

export function runSimulation(asset: AssetPreset, input: SimulationInput): SimulationResult {
  const { initialCapital, monthlyDeposit, months, selicRateYearly, ipcaRateYearly } = input;

  // Taxa nominal a.a. do ativo com base na Selic informada
  const annualNominalReturn = asset.annualNominalReturn(selicRateYearly);
  const monthlyNominalReturnRate = Math.pow(1 + annualNominalReturn, 1 / 12) - 1;

  // Taxa de IPCA mensal
  const monthlyIpcaRate = Math.pow(1 + ipcaRateYearly, 1 / 12) - 1;

  // Componentes de Dividend Yield se aplicável (ex: FIIs)
  const annualDividendYield = asset.expectedDividendYieldYearly || 0;
  const monthlyDividendRate = Math.pow(1 + annualDividendYield, 1 / 12) - 1;

  let currentGrossAmount = initialCapital;
  let accumulatedContributions = initialCapital;
  let accumulatedB3Fee = 0;

  const monthlyBreakdown: MonthlyBreakdown[] = [];

  for (let m = 1; m <= months; m++) {
    // Rendimento bruto do mês sobre o montante acumulado e novo aporte
    const interestOnPreviousGross = currentGrossAmount * monthlyNominalReturnRate;
    const interestOnNewDeposit = monthlyDeposit * (monthlyNominalReturnRate / 2); // Média de permanência do aporte no mês
    const monthGrossInterest = interestOnPreviousGross + interestOnNewDeposit;

    currentGrossAmount += monthGrossInterest + monthlyDeposit;
    accumulatedContributions += monthlyDeposit;

    // Cálculo da taxa B3 pro-rata mês
    const monthB3Fee = calculateMonthlyB3Fee(
      asset.id,
      currentGrossAmount,
      asset.taxRules.b3CustodyFeeYearly
    );
    accumulatedB3Fee += monthB3Fee;

    // Tributação simulada no resgate no mês m
    const totalGrossYield = Math.max(0, currentGrossAmount - accumulatedContributions);

    let monthTaxAmount = 0;

    if (asset.taxRules.taxType === 'FIIS' && annualDividendYield > 0) {
      // FIIs: proventos são isentos (isento mensal), IR de 20% incide apenas sobre ganho de capital (valorização de cota)
      const capitalGainRate = Math.max(0, monthlyNominalReturnRate - monthlyDividendRate);
      const totalCapitalGainPortion = totalGrossYield * (capitalGainRate / (monthlyNominalReturnRate || 1));
      monthTaxAmount = totalCapitalGainPortion * 0.20;
    } else {
      const taxRate = calculateIncomeTaxRate(asset.taxRules, m);
      monthTaxAmount = totalGrossYield * taxRate;
    }

    const netAmountNominal = Math.max(0, currentGrossAmount - monthTaxAmount - accumulatedB3Fee);

    // Inflação acumulada no mês m (Fisher)
    const inflationFactorAccumulated = Math.pow(1 + monthlyIpcaRate, m);
    const netAmountReal = netAmountNominal / inflationFactorAccumulated;
    const realProfitAccumulated = netAmountReal - accumulatedContributions;

    monthlyBreakdown.push({
      month: m,
      contributionsAccumulated: Math.round(accumulatedContributions * 100) / 100,
      grossAmount: Math.round(currentGrossAmount * 100) / 100,
      grossInterestEarned: Math.round(monthGrossInterest * 100) / 100,
      estimatedTaxAmount: Math.round(monthTaxAmount * 100) / 100,
      b3CustodyFeeAccumulated: Math.round(accumulatedB3Fee * 100) / 100,
      netAmountNominal: Math.round(netAmountNominal * 100) / 100,
      inflationFactorAccumulated: Math.round(inflationFactorAccumulated * 10000) / 10000,
      netAmountReal: Math.round(netAmountReal * 100) / 100,
      realProfitAccumulated: Math.round(realProfitAccumulated * 100) / 100,
    });
  }

  const lastMonth = monthlyBreakdown[monthlyBreakdown.length - 1];

  const finalGrossAmount = lastMonth.grossAmount;
  const totalGrossYield = Math.max(0, finalGrossAmount - accumulatedContributions);
  const totalIncomeTaxPaid = lastMonth.estimatedTaxAmount;
  const totalB3CustodyFee = lastMonth.b3CustodyFeeAccumulated;
  const finalNetAmountNominal = lastMonth.netAmountNominal;
  const finalNetAmountReal = lastMonth.netAmountReal;

  const effectiveTaxRatePercent = totalGrossYield > 0 ? (totalIncomeTaxPaid / totalGrossYield) * 100 : 0;
  const nominalYieldPercent = accumulatedContributions > 0 ? ((finalNetAmountNominal - accumulatedContributions) / accumulatedContributions) * 100 : 0;

  // Rentabilidade Real acumulada no período (Estatística Fisher)
  // 1 + R_real = (1 + R_liquido) / (1 + IPCA)
  const totalIpcaFactor = Math.pow(1 + monthlyIpcaRate, months);
  const totalNominalFactor = finalNetAmountNominal / accumulatedContributions;
  const realYieldTotalPercent = ((totalNominalFactor / totalIpcaFactor) - 1) * 100;

  // Anualização da taxa real
  const years = months / 12;
  const realYieldAnnualizedPercent = years > 0 ? (Math.pow(1 + realYieldTotalPercent / 100, 1 / years) - 1) * 100 : 0;

  // Retirada Sustentável Mensal ("Ativo Natural")
  // Taxa real líquida mensal: (1 + r_liquido_mensal) / (1 + ipca_mensal) - 1
  const monthlyRealNetYieldRate = ((1 + monthlyNominalReturnRate) / (1 + monthlyIpcaRate)) - 1;
  const sustainableMonthlyCashFlowReal = Math.max(0, finalNetAmountReal * monthlyRealNetYieldRate);

  return {
    asset,
    months,
    totalContributed: Math.round(accumulatedContributions * 100) / 100,
    finalGrossAmount,
    totalGrossYield: Math.round(totalGrossYield * 100) / 100,
    totalIncomeTaxPaid,
    effectiveTaxRatePercent: Math.round(effectiveTaxRatePercent * 100) / 100,
    totalB3CustodyFee,
    finalNetAmountNominal,
    nominalYieldPercent: Math.round(nominalYieldPercent * 100) / 100,
    finalNetAmountReal,
    realYieldTotalPercent: Math.round(realYieldTotalPercent * 100) / 100,
    realYieldAnnualizedPercent: Math.round(realYieldAnnualizedPercent * 100) / 100,
    sustainableMonthlyCashFlowReal: Math.round(sustainableMonthlyCashFlowReal * 100) / 100,
    monthlyBreakdown,
  };
}
