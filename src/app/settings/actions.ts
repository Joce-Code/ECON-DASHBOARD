'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- Portfolios ---

export async function getPortfolio() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { indicators: ['IPCA', 'Selic', 'Dólar'] }

  const { data, error } = await supabase
    .from('portfolios')
    .select('indicators')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !data) {
    const defaultIndicators = ['IPCA', 'Selic', 'Dólar']
    // Tentar criar se não existir
    await supabase.from('portfolios').upsert({ id: user.id, indicators: defaultIndicators })
    return { indicators: defaultIndicators }
  }

  return data
}

export async function updatePortfolio(indicators: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Usuário não autenticado." }

  const { error } = await supabase
    .from('portfolios')
    .upsert({ id: user.id, indicators })

  if (error) {
    console.error("Erro ao salvar portfolio:", error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/settings')
  return { success: true }
}

// --- Alert Rules ---

export async function getAlertRules() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Erro ao buscar alert_rules:", error)
    return []
  }
  return data
}

export async function createAlertRule(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const indicator = formData.get('indicator') as string
  const condition = formData.get('condition') as string
  const threshold = parseFloat(formData.get('threshold') as string)
  const email_target = formData.get('email_target') as string

  const { error } = await supabase
    .from('alert_rules')
    .insert({
      user_id: user.id,
      indicator,
      condition,
      threshold,
      email_target
    })

  if (error) throw new Error(error.message)

  revalidatePath('/settings')
}

export async function deleteAlertRule(ruleId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('alert_rules')
    .delete()
    .eq('id', ruleId)
    .eq('user_id', user.id) // Security check

  if (error) throw new Error(error.message)

  revalidatePath('/settings')
}
