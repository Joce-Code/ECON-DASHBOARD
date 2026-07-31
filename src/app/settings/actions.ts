'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- Portfolios ---

export async function getPortfolio() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { indicators: [] }

  const { data, error } = await supabase
    .from('portfolios')
    .select('indicators')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    // If not found, create default for this user
    const defaultIndicators = ['IPCA', 'Selic', 'Dólar']
    await supabase.from('portfolios').insert({ id: user.id, indicators: defaultIndicators })
    return { indicators: defaultIndicators }
  }

  return data
}

export async function updatePortfolio(indicators: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('portfolios')
    .update({ indicators })
    .eq('id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/')
  revalidatePath('/settings')
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
