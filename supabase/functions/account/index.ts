// Account actions that need server-side rights: permanently erasing a project, or deleting the account.
// The caller's own session decides whose data is touched; the request body never names an owner.
// Runs on Supabase Edge Functions with the service role key from the function's environment (never the browser).
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const ALLOWED_ORIGINS = ['https://plangta.ca', 'https://www.plangta.ca', 'https://gta-proforma.azharmoolla.workers.dev', 'http://localhost:5180', 'http://localhost:5181']

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const cors = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]!,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth, error: authError } = await admin.auth.getUser(token)
  const user = auth?.user
  if (authError || !user) return json({ error: 'Sign in again to do this' }, 401)

  const body = await req.json().catch(() => ({})) as { action?: string; clientId?: string }
  const removeFiles = async (paths: string[]) => {
    for (let i = 0; i < paths.length; i += 500) {
      const { error } = await admin.storage.from('receipts').remove(paths.slice(i, i + 500))
      if (error) throw new Error(`Removing receipt files: ${error.message}`)
    }
  }

  try {
    if (body.action === 'erase-project') {
      if (typeof body.clientId !== 'string' || !body.clientId) return json({ error: 'Which project?' }, 400)
      const { data: rows, error } = await admin.from('projects').select('id').eq('owner_id', user.id).eq('demo_id', body.clientId)
      if (error) throw error
      for (const row of rows ?? []) {
        const { data: paths, error: eraseError } = await admin.rpc('erase_owner_data', { p_owner: user.id, p_project: row.id })
        if (eraseError) throw eraseError
        await removeFiles((paths ?? []) as string[])
      }
      return json({ ok: true, erased: rows?.length ?? 0 })
    }
    if (body.action === 'delete-account') {
      const { data: paths, error } = await admin.rpc('erase_owner_data', { p_owner: user.id, p_project: null })
      if (error) throw error
      await removeFiles((paths ?? []) as string[])
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
      if (deleteError) throw deleteError
      return json({ ok: true })
    }
    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Something went wrong' }, 500)
  }
})
