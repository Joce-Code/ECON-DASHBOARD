import { getAlertRules } from "./actions";
import SettingsForm from "@/components/SettingsForm";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const alertRules = await getAlertRules();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white">Central de Alertas</h2>
        <p className="text-slate-400 mt-1">Configure gatilhos automáticos de e-mail para ser notificado sobre variações de mercado.</p>
      </div>

      <SettingsForm 
        initialAlertRules={alertRules || []} 
      />
    </div>
  );
}
