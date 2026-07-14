import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars. Require SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_*_KEY.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function keepAlive() {
  console.log(`[${new Date().toISOString()}] supabase keep-alive started`)

  let successCount = 0
  let dbTouched = false
  const operations = []

  try {
    const { data, error } = await supabase.storage.listBuckets()
    if (error) {
      console.error('storage api error:', error)
      operations.push({ method: 'storage.listBuckets', success: false, error: error.message })
    } else {
      operations.push({ method: 'storage.listBuckets', success: true, buckets: data?.length ?? 0 })
      successCount++
    }
  } catch (error) {
    console.error('storage api exception:', error)
    operations.push({ method: 'storage.listBuckets', success: false, error: String(error) })
  }

  try {
    const { error } = await supabase
      .from(`_keep_alive_test_${Date.now()}`)
      .select('*')
      .limit(1)

    if (!error) {
      operations.push({ method: 'db.query', success: true, note: 'unexpected success' })
      successCount++
      dbTouched = true
    } else if (error.code === '42P01') {
      operations.push({ method: 'db.query', success: true, note: 'expected table not found' })
      successCount++
      dbTouched = true
    } else {
      console.error('db query error:', error)
      operations.push({ method: 'db.query', success: false, error: error.message, code: error.code })
    }
  } catch (error) {
    console.error('db query exception:', error)
    operations.push({ method: 'db.query', success: false, error: String(error) })
  }

  try {
    const { error } = await supabase.auth.getUser()
    if (!error || error.message === 'Auth session missing!') {
      operations.push({ method: 'auth.getUser', success: true })
      successCount++
    } else {
      console.error('auth api error:', error)
      operations.push({ method: 'auth.getUser', success: false, error: error.message })
    }
  } catch (error) {
    console.error('auth api exception:', error)
    operations.push({ method: 'auth.getUser', success: false, error: String(error) })
  }

  console.log(`[${new Date().toISOString()}] supabase keep-alive finished`)
  console.log(`success operations: ${successCount}/${operations.length}`)
  console.log(JSON.stringify(operations, null, 2))

  if (!dbTouched) {
    console.error('No database activity detected, keep-alive failed.')
    process.exit(1)
  }
}

keepAlive()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('supabase keep-alive failed:', error)
    process.exit(1)
  })
