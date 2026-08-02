export interface BcbRatesData {
  selicRateYearly: number; // Ex: 0.105 (10.5%)
  ipcaRateYearly: number;  // Ex: 0.040 (4.0%)
  lastUpdated: string;
  source: 'BCB_LIVE' | 'FALLBACK';
}

/**
 * Busca a Taxa Selic Meta atual no SGS do Banco Central (Série 432)
 */
async function fetchSelicMeta(): Promise<number | null> {
  try {
    const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json');
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const val = parseFloat(data[0].valor);
      if (!isNaN(val) && val > 0) {
        return val / 100; // Converte % para decimal (ex: 10.5 -> 0.105)
      }
    }
    return null;
  } catch (err) {
    console.warn('Erro ao buscar Selic do BCB:', err);
    return null;
  }
}

/**
 * Busca a Expectativa de IPCA no Boletim Focus do Banco Central (Olinda API)
 * Busca a mediana do relatório Focus para o ano corrente.
 */
async function fetchIpcaFocus(): Promise<number | null> {
  try {
    const currentYear = new Date().getFullYear().toString();
    const url = `https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?$top=5&$filter=Indicador%20eq%20'IPCA'%20and%20DataReferencia%20eq%20'${currentYear}'&$orderby=Data%20desc&$format=json`;
    
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.value && data.value.length > 0) {
      const item = data.value[0];
      const val = parseFloat(item.Mediana);
      if (!isNaN(val) && val > 0) {
        return val / 100; // Converte % para decimal (ex: 4.0 -> 0.04)
      }
    }
    return null;
  } catch (err) {
    console.warn('Erro ao buscar IPCA Focus do BCB:', err);
    return null;
  }
}

/**
 * Obtém as taxas oficiais do Banco Central do Brasil com fallback em caso de falha.
 */
export async function getBcbLiveRates(): Promise<BcbRatesData> {
  const [selic, ipca] = await Promise.all([fetchSelicMeta(), fetchIpcaFocus()]);

  const now = new Date().toLocaleDateString('pt-BR');

  if (selic !== null || ipca !== null) {
    return {
      selicRateYearly: selic ?? 0.105,
      ipcaRateYearly: ipca ?? 0.040,
      lastUpdated: now,
      source: 'BCB_LIVE',
    };
  }

  return {
    selicRateYearly: 0.105,
    ipcaRateYearly: 0.040,
    lastUpdated: now,
    source: 'FALLBACK',
  };
}
