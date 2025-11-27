
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function closeAllClaims() {
    const { error } = await supabase
        .from('claims')
        .update({ status: 'Closed' })
        .neq('status', 'Closed')

    if (error) {
        console.error('Error closing claims:', error)
    } else {
        console.log('All claims closed successfully.')
    }
}

closeAllClaims()
