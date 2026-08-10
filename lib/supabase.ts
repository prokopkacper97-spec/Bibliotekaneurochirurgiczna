import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not set. Copy .env.example to .env and fill it in.");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not set. Copy .env.example to .env and fill it in."
  );
}

// Server-only client using the service role key: bypasses row-level security,
// so it must never be sent to the browser or used outside API routes.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "library";
