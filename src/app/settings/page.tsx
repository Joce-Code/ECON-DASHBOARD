import { getPortfolio, getAlertRules } from "./actions";
import SettingsForm from "@/components/SettingsForm";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const portfolio = await getPortfolio();
  const alertRules = await getAlertRules();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white">Sala de Comando</h2>
        <p className="text-slate-400 mt-1">Configure o seu painel de observabilidade e as regras do motor de alertas.</p>
      </div>

      <SettingsForm 
        initialPortfolio={portfolio.indicators || []} 
        initialAlertRules={alertRules || []} 
      />
    </div>
  );
}
