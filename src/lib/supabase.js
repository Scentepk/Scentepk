import { createClient } from "@supabase/supabase-js";

// Clean and normalize URL (strips trailing slashes and accidental /rest/v1 suffixes)
const rawUrl = import.meta.env?.VITE_SUPABASE_URL;
const rawKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = rawUrl
  ? rawUrl.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "")
  : "";
const supabaseAnonKey = rawKey ? rawKey.trim() : "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "https://your-project-id.supabase.co" &&
    supabaseAnonKey !== "your-anon-key-here"
);

// Centralized Supabase client instance using ONLY the public anon key
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

