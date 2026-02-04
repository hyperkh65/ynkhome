
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Prevent build errors if env vars are missing or placeholders
const isValid = supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== 'YOUR_SUPABASE_URL' &&
    supabaseKey !== 'YOUR_SUPABASE_ANON_KEY';

if (!isValid) {
    console.warn("Supabase credentials missing or invalid. DB features will fallback to local storage.");
}

export const supabase = isValid
    ? createClient(supabaseUrl, supabaseKey)
    : null;
