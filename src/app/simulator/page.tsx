import RealProfitSimulator from "@/components/simulator/RealProfitSimulator";

export const metadata = {
  title: "Simulador de Lucro Real & Trade-off | Focus Tracker",
  description: "Simule a rentabilidade real descontando inflação (IPCA), Imposto de Renda (tabela regressiva) e custódia B3 com dados ao vivo do Banco Central.",
};

export default function SimulatorPage() {
  return <RealProfitSimulator />;
}
