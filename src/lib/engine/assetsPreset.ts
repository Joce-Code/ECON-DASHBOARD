import { AssetPreset } from '@/domain/types';

export const ASSET_PRESETS: AssetPreset[] = [
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
    annualNominalReturn: (selic) => {
      return 0.0620 + 0.040; // Retorno nominal estimado
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
    id: 'fiis-imobiliarios',
    name: 'FIIs (Fundos Imobiliários)',
    category: 'FIIS',
    description: 'Portfólio diversificado de imóveis comerciais e títulos imobiliários com renda mensal isenta.',
    annualNominalReturn: (selic) => 0.125, // Retorno médio total (Proventos ~9.5% + Valorização ~3.0%)
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
    annualNominalReturn: (selic) => 0.145, // Retorno nominal histórico de mercado de ações
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
