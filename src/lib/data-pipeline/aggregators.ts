import { fetchBronzeFocusMensal, fetchBronzeFocusCopom, fetchBronzeSGS } from "./ingestion";
import { FocusResponseSchema, SGSResponseSchema } from "./observability";

// Gold Layer: Limpeza, Validação Zod e Agregação de Deltas

export async function getGoldFocusMensal() {
  try {
    const raw = await fetchBronzeFocusMensal();
    // Silver: Validação estrita
    const parsed = FocusResponseSchema.parse(raw);
    
    // Gold: Agrupar por indicador e pegar os mais recentes
    const ipca = parsed.value.filter(v => v.Indicador === 'IPCA').slice(0, 5);
    const cambio = parsed.value.filter(v => v.Indicador === 'Câmbio').slice(0, 5);
    
    return { ipca, cambio };
  } catch (e) {
    console.error("Data Observability Error [Focus Mensal]:", e);
    return { ipca: [], cambio: [], error: true };
  }
}

export async function getGoldFocusCopom() {
  try {
    const raw = await fetchBronzeFocusCopom();
    const parsed = FocusResponseSchema.parse(raw);
    
    // Pegar apenas as próximas 5 reuniões
    const reunions = parsed.value.filter(v => v.Reuniao && v.Reuniao.startsWith('R')).slice(0, 5);
    
    return { reuniões: reunions };
  } catch (e) {
    console.error("Data Observability Error [Focus Copom]:", e);
    return { reuniões: [], error: true };
  }
}

export async function getGoldKPIs() {
  try {
    // 433 = IPCA, 432 = Selic, 1 = Dólar
    const [rawIpca, rawSelic, rawDolar] = await Promise.all([
      fetchBronzeSGS(433),
      fetchBronzeSGS(432),
      fetchBronzeSGS(1)
    ]);

    const ipca = SGSResponseSchema.parse(rawIpca);
    const selic = SGSResponseSchema.parse(rawSelic);
    const dolar = SGSResponseSchema.parse(rawDolar);

    // Deltas
    const currIpca = ipca[ipca.length - 1];
    const prevIpca = ipca[ipca.length - 2];
    
    const currSelic = selic[selic.length - 1];
    
    const currDolar = dolar[dolar.length - 1];
    const prevDolar = dolar[dolar.length - 2];

    return {
      ipca: { valor: currIpca.valor, delta: (currIpca.valor - prevIpca.valor).toFixed(2), data: currIpca.data },
      selic: { valor: currSelic.valor, data: currSelic.data },
      dolar: { valor: currDolar.valor, delta: (currDolar.valor - prevDolar.valor).toFixed(4), data: currDolar.data }
    };
  } catch (e) {
    console.error("Data Observability Error [SGS KPIs]:", e);
    return { error: true };
  }
}
