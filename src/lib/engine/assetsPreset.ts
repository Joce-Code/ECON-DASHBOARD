import { AssetPreset } from '@/domain/types';

export const ASSET_PRESETS: AssetPreset[] = [
  {
    id: 'cdb-100-cdi',
    name: 'CDB 100% CDI (Liquidez Diária)',
    category: 'RENDA_FIXA_CDB',
    description: 'Título pós-fixado tradicional de grandes bancos com liquidez diária e garantia do FGC.',
    annualNominalReturn: (selic) => (selic - 0.001) * 1.00,
    expectedDividendYieldYearly: 0,
    taxRules: {
      taxType: 'REGRESSIVA_RF',
      b3CustodyFeeYearly: 0,
    },
    liquidityDays: 0, // D+0
    volatilityRating: 'BAIXA',
    fgcProtection: true,
  },
  {
    id: 'cdb-110-cdi',
    name: 'CDB 110% CDI',
    category: 'RENDA_FIXA_CDB',
    description: 'Título de renda fixa bancária pós-fixado com rentabilidade acima do CDI e garantia do FGC.',
    annualNominalReturn: (selic) => (selic - 0.001) * 1.10, // CDI é ~Selic - 0,10%
    expectedDividendYieldYearly: 0,
    taxRules: {
      taxType: 'REGRESSIVA_RF',
      b3CustodyFeeYearly: 0,
    },
    liquidityDays: 1, // D+1
    volatilityRating: 'BAIXA',
    fgcProtection: true,
  },
  {
    id: 'cdb-120-cdi',
    name: 'CDB 120% CDI (Médio Prazo)',
    category: 'RENDA_FIXA_CDB',
    description: 'Título de bancos médios com carência e rentabilidade diferenciada de 120% do CDI.',
    annualNominalReturn: (selic) => (selic - 0.001) * 1.20,
    expectedDividendYieldYearly: 0,
    taxRules: {
      taxType: 'REGRESSIVA_RF',
      b3CustodyFeeYearly: 0,
    },
    liquidityDays: 180, // Carência
    volatilityRating: 'BAIXA',
    fgcProtection: true,
  },
  {
    id: 'cdb-custom-cdi',
    name: 'CDB Personalizado (% do CDI)',
    category: 'RENDA_FIXA_CDB',
    description: 'Cálculo dinâmico baseado no percentual customizado do CDI configurado na simulação.',
    annualNominalReturn: (selic, input) => {
      const cdiPct = (input?.customCdiPercent || 110) / 100;
      return (selic - 0.001) * cdiPct;
    },
    expectedDividendYieldYearly: 0,
    taxRules: {
      taxType: 'REGRESSIVA_RF',
      b3CustodyFeeYearly: 0,
    },
    liquidityDays: 1,
    volatilityRating: 'BAIXA',
    fgcProtection: true,
  },
  {
    id: 'lci-lca-95-cdi',
    name: 'LCI / LCA 95% CDI (Isento IR)',
    category: 'RENDA_FIXA_ISENTO',
    description: 'Letra de Crédito Imobiliário/Agronegócio isenta de Imposto de Renda para Pessoa Física.',
    annualNominalReturn: (selic) => (selic - 0.001) * 0.95,
    expectedDividendYieldYearly: 0,
    taxRules: {
      taxType: 'ISENTO',
      b3CustodyFeeYearly: 0,
    },
    liquidityDays: 90, // Carência / Liquidez após prazo
    volatilityRating: 'BAIXA',
    fgcProtection: true,
  },
  {
    id: 'cri-cra-isento',
    name: 'CRI / CRA 105% CDI (Isento IR)',
    category: 'RENDA_FIXA_ISENTO',
    description: 'Crédito Privado Imobiliário/Agro isento de IR com prêmio de retorno elevado.',
    annualNominalReturn: (selic) => (selic - 0.001) * 1.05,
    expectedDividendYieldYearly: 0,
    taxRules: {
      taxType: 'ISENTO',
      b3CustodyFeeYearly: 0,
    },
    liquidityDays: 360,
    volatilityRating: 'MEDIA',
    fgcProtection: false, // Sem FGC (Crédito Corporativo)
  },
  {
    id: 'debenture-incentivada',
    name: 'Debênture Incentivada (IPCA + 7.2% Isenta IR)',
    category: 'RENDA_FIXA_ISENTO',
    description: 'Título de dívida de infraestrutura com isenção fiscal e cupom real indexado à inflação.',
    annualNominalReturn: (selic, input) => {
      const ipca = input?.ipcaRateYearly || 0.040;
      return 0.072 + ipca;
    },
    expectedDividendYieldYearly: 0,
    taxRules: {
      taxType: 'ISENTO',
      b3CustodyFeeYearly: 0,
    },
    liquidityDays: 720,
    volatilityRating: 'MEDIA',
    fgcProtection: false,
  },
  {
    id: 'tesouro-selic',
    name: 'Tesouro Selic (com Custódia B3)',
    category: 'TESOURO_DIRETO',
    description: 'Título soberano do Governo Federal com liquidez diária e menor risco de crédito do país.',
    annualNominalReturn: (selic) => selic,
    expectedDividendYieldYearly: 0,
    taxRules: {
      taxType: 'REGRESSIVA_RF',
      b3CustodyFeeYearly: 0.0020, // 0,20% a.a. sobre excedente de R$ 10k
    },
    liquidityDays: 0, // D+0
    volatilityRating: 'BAIXA',
    fgcProtection: false, // Garantia soberana do Tesouro Nacional
  },
  {
    id: 'tesouro-ipca-plus',
    name: 'Tesouro IPCA+ (IPCA + 6,2% a.a.)',
    category: 'TESOURO_DIRETO',
    description: 'Proteção direta contra a inflação garantindo um cupom de taxa real fixa acima do IPCA.',
    annualNominalReturn: (selic, input) => {
      const ipca = input?.ipcaRateYearly || 0.040;
      return 0.0620 + ipca; // Retorno nominal estimado
    },
    expectedDividendYieldYearly: 0,
    taxRules: {
      taxType: 'REGRESSIVA_RF',
      b3CustodyFeeYearly: 0.0020,
    },
    liquidityDays: 0,
    volatilityRating: 'MEDIA', // Sujeito a Marcação a Mercado no curto prazo
    fgcProtection: false,
  },
  {
    id: 'tesouro-prefixado',
    name: 'Tesouro Pré-fixado (13,50% a.a.)',
    category: 'TESOURO_DIRETO',
    description: 'Taxa nominal cravada garantindo previsibilidade exata de retorno até o vencimento.',
    annualNominalReturn: () => 0.1350,
    expectedDividendYieldYearly: 0,
    taxRules: {
      taxType: 'REGRESSIVA_RF',
      b3CustodyFeeYearly: 0.0020,
    },
    liquidityDays: 0,
    volatilityRating: 'MEDIA',
    fgcProtection: false,
  },
  {
    id: 'fiis-imobiliarios',
    name: 'FIIs (Fundos Imobiliários)',
    category: 'FIIS',
    description: 'Portfólio diversificado de imóveis comerciais e títulos imobiliários com renda mensal isenta.',
    annualNominalReturn: () => 0.125, // Retorno médio total (Proventos ~9.5% + Valorização ~3.0%)
    expectedDividendYieldYearly: 0.095, // 9.5% a.a. em dividendos isentos
    taxRules: {
      taxType: 'FIIS',
      b3CustodyFeeYearly: 0,
    },
    liquidityDays: 2, // D+2 na Bolsa
    volatilityRating: 'MEDIA',
    fgcProtection: false,
  },
  {
    id: 'acoes-ivvb11',
    name: 'Ações / ETF IVVB11 (S&P 500)',
    category: 'ACOES',
    description: 'Exposição às 500 maiores empresas americanas dolarizadas com alto potencial de ganho de capital.',
    annualNominalReturn: () => 0.145, // Retorno nominal histórico de mercado de ações
    expectedDividendYieldYearly: 0.015,
    taxRules: {
      taxType: 'ACOES_SWING',
      b3CustodyFeeYearly: 0,
      exemptUpToMonthlySales: 20000,
    },
    liquidityDays: 2,
    volatilityRating: 'ALTA',
    fgcProtection: false,
  },
];
