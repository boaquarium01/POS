import { createClient } from '@supabase/supabase-js'

// 改成你的 Supabase 專案資訊
const supabaseUrl = 'https://qvhrfgthzuowlhsljhom.supabase.co'
const supabaseKey = 'sb_publishable_3jEIXm7nFGA7rtPL8kQ0Kw_HHhDIMNR'

export const supabase = createClient(supabaseUrl, supabaseKey)
