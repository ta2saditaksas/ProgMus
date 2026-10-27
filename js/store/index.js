import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";
import { localStore } from "./local.js";

// Choisit le stockage : Supabase si configuré, sinon local.
export async function createStore() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const { supabaseStore } = await import("./supabase.js");
    return supabaseStore(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return localStore;
}
