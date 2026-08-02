export type AssetCategory = 'RENDA_FIXA_CDB' | 'RENDA_FIXA_ISENTO' | 'TESOURO_DIRETO' | 'ACOES' | 'FIIS';

export type InvestorProfile = 'CONSERVADOR' | 'MODERADO' | 'ARROJADO';
export type InvestmentGoal = 'RESERVA_EMERGENCIA' | 'RENDA_PASSIVA' | 'ACUMULACAO_APOSENTADORIA';

export interface AssetTaxRules {
  taxType: 'REGRESSIVA_RF' | 'ISENTO' | 'ACOES_SWING' | 'FIIS';
  b3CustodyFeeYearly: number; // Ex: 0.002 (0.20% a.a.) para Tesouro Selic > R$10k
  exemptUpToMonthlySales?: number; // Ex: 20000 para ações
}

export interface AssetPreset {
  id: string;
  name: string;
  category: AssetCategory;
  description: string;
  annualNominalReturn: (selic: number) => number; // Retorno nominal bruto a.a. em decimal
  expectedDividendYieldYearly: number; // Para FIIs/Ações
  taxRules: AssetTaxRules;
  liquidityDays: number; // 0 = D+0, 1 = D+1, 1080 = 3 anos
  volatilityRating: 'BAIXA' | 'MEDIA' | 'ALTA' | 'MUITO_ALTA';
  fgcProtection: boolean;
}

export interface SimulationInput {
  initialCapital: number;
  monthlyDeposit: number;
  months: number;
  selicRateYearly: number; // ex: 10.5 => 0.105
  ipcaRateYearly: number;  // ex: 4.0 => 0.040
  investorProfile: InvestorProfile;
  investmentGoal: InvestmentGoal;
  selectedAssetIds?: string[];
}

export interface MonthlyBreakdown {
  month: number;
  contributionsAccumulated: number;
  grossAmount: number;
  grossInterestEarned: number;
  estimatedTaxAmount: number;
  b3CustodyFeeAccumulated: number;
  netAmountNominal: number;
  inflationFactorAccumulated: number;
  netAmountReal: number; // Montante corrigido pelo IPCA
  realProfitAccumulated: number; // Montante Real - Aportes Acumulados
}

export interface SimulationResult {
  asset: AssetPreset;
  months: number;
  totalContributed: number;
  finalGrossAmount: number;
  totalGrossYield: number;
  totalIncomeTaxPaid: number;
  effectiveTaxRatePercent: number;
  totalB3CustodyFee: number;
  finalNetAmountNominal: number;
  nominalYieldPercent: number;
  finalNetAmountReal: number; // Descontando IPCA pelo método Fisher
  realYieldTotalPercent: number; // Rendimento real no período
  realYieldAnnualizedPercent: number; // Rendimento real a.a.
  sustainableMonthlyCashFlowReal: number; // Retirada sustentável sem queima de capital real ("Ativo Natural")
  monthlyBreakdown: MonthlyBreakdown[];
}

export interface SWOTItem {
  strengths: string[];
  opportunities: string[];
  weaknesses: string[];
  threats: string[];
}

export interface TradeoffScore {
  assetId: string;
  assetName: string;
  liquidityScore: number; // 0-100
  riskScore: number;      // 0-100 (100 = maior risco/volatilidade)
  returnScore: number;    // 0-100
  suitabilityScore: number; // 0-100 (Adequação ao perfil/objetivo)
  suitabilityBadge: 'ALTAMENTE_RECOMENDADO' | 'ADEQUADO' | 'ATENCAO' | 'NAO_RECOMENDADO';
  recommendationReason: string;
}
