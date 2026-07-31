import { fetchBronzeFocusMensal, fetchBronzeFocusCopom, fetchBronzeSGS } from "./ingestion";
import { FocusResponseSchema, SGSResponseSchema } from "./observability";

// Gold Layer: Limpeza, Validação Zod e Agregação de Deltas

export async function getGoldFocusMensal() {
  try {
    const raw = await fetchBronzeFocusMensal();
    const parsed = FocusResponseSchema.parse(raw);
    
    // Obter apenas a data de publicação mais recente no batch
    const latestDate = parsed.value.length > 0 ? parsed.value[0].Data : '';
    
    // Filtrar IPCA, apenas baseCalculo = 0, da última publicação
    let ipca = parsed.value.filter(v => v.Indicador === 'IPCA' && v.baseCalculo === 0 && v.Data === latestDate);
    
    // Ordenar DataReferencia cronologicamente (MM/YYYY)
    ipca.sort((a, b) => {
      const [mA, yA] = (a.DataReferencia || '').split('/');
      const [mB, yB] = (b.DataReferencia || '').split('/');
      return Number(yA) * 12 + Number(mA) - (Number(yB) * 12 + Number(mB));
    });
    
    // Pegar as próximas 4 previsões
    ipca = ipca.slice(0, 4);
    
    return { ipca };
  } catch (e) {
    console.error("Data Observability Error [Focus Mensal]:", e);
    return { ipca: [], error: true };
  }
}

export async function getGoldFocusCopom() {
  try {
    const raw = await fetchBronzeFocusCopom();
    const parsed = FocusResponseSchema.parse(raw);
    
    const latestDate = parsed.value.length > 0 ? parsed.value[0].Data : '';
    
    // Filtrar Selic, apenas baseCalculo = 0, da última publicação
    let reunions = parsed.value.filter(v => v.Reuniao && v.Reuniao.startsWith('R') && v.baseCalculo === 0 && v.Data === latestDate);
    
    // Ordenar Reuniao cronologicamente (R1/YYYY)
    reunions.sort((a, b) => {
      const matchA = a.Reuniao?.match(/R(\d+)\/(\d+)/);
      const matchB = b.Reuniao?.match(/R(\d+)\/(\d+)/);
      if (!matchA || !matchB) return 0;
      return Number(matchA[2]) * 10 + Number(matchA[1]) - (Number(matchB[2]) * 10 + Number(matchB[1]));
    });
    
    reunions = reunions.slice(0, 4);
    
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
