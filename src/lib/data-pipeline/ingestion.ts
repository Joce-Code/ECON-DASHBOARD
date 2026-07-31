// Bronze Layer: Ingestão bruta com suporte a Edge Cache / ISR
const BASE_ODATA = "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata";
const BASE_SGS = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

// Utiliza fetch com next: { revalidate: 3600 } para gerar ISR a cada hora
export async function fetchBronzeFocusMensal() {
  const url = `${BASE_ODATA}/ExpectativaMercadoMensais?$filter=Indicador%20eq%20'IPCA'%20or%20Indicador%20eq%20'Câmbio'&$orderby=Data%20desc&$top=100&$format=json`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Falha na ingestão Bronze: Focus Mensal");
  return res.json();
}

export async function fetchBronzeFocusCopom() {
  const url = `${BASE_ODATA}/ExpectativasMercadoSelic?$filter=Indicador%20eq%20'Selic'&$orderby=Data%20desc&$top=50&$format=json`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Falha na ingestão Bronze: Focus Copom");
  return res.json();
}

export async function fetchBronzeSGS(code: number) {
  // Para SGS, o BCB impõe um limite máximo de 20 registros nesse endpoint
  const url = `${BASE_SGS}.${code}/dados/ultimos/20?formato=json`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Falha na ingestão Bronze: SGS ${code}`);
  return res.json();
}
