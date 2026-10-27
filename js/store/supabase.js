// Stockage Supabase : même interface que le stockage local.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

export function supabaseStore(url, anonKey) {
  const sb = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  let userId = null;

  const check = ({ data, error }) => {
    if (error) throw new Error(translate(error));
    return data;
  };

  return {
    mode: "supabase",

    async getUser() {
      const { data } = await sb.auth.getSession();
      const u = data.session?.user || null;
      userId = u?.id || null;
      return u ? { id: u.id, email: u.email } : null;
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_evt, session) => {
        userId = session?.user?.id || null;
        cb(session?.user ? { id: session.user.id, email: session.user.email } : null);
      });
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      check(await sb.auth.signInWithPassword({ email, password }));
    },
    async signUp(email, password) {
      const data = check(await sb.auth.signUp({
        email, password, options: { emailRedirectTo: location.origin + location.pathname },
      }));
      return { needsConfirmation: !data.session };
    },
    async signOut() { await sb.auth.signOut(); },

    async listExercises() {
      return check(await sb.from("exercises").select("*").order("created_at"));
    },
    async saveExercise(ex) {
      const row = { ...ex, user_id: userId };
      return check(await sb.from("exercises").upsert(row).select().single());
    },
    async deleteExercise(id) { check(await sb.from("exercises").delete().eq("id", id)); },

    async listWorkouts() {
      return check(await sb.from("workouts").select("*").order("position"));
    },
    async saveWorkout(w) {
      const row = { ...w, user_id: userId };
      return check(await sb.from("workouts").upsert(row).select().single());
    },
    async deleteWorkout(id) { check(await sb.from("workouts").delete().eq("id", id)); },

    async listSessions() {
      return check(await sb.from("sessions").select("*").order("date", { ascending: false }));
    },
    async saveSession(s) {
      const row = { ...s, user_id: userId, updated_at: new Date().toISOString() };
      if (!row.id) delete row.id;
      if (row.workout_id) {
        return check(await sb.from("sessions")
          .upsert(row, { onConflict: "user_id,date,workout_id" }).select().single());
      }
      return check(await sb.from("sessions").upsert(row).select().single());
    },
    async deleteSession(id) { check(await sb.from("sessions").delete().eq("id", id)); },
  };
}

function translate(error) {
  const m = (error && error.message) || "";
  if (/Invalid login credentials/i.test(m)) return "Email ou mot de passe incorrect.";
  if (/Email not confirmed/i.test(m)) return "Confirme d'abord ton email avec le lien reçu.";
  if (/already registered/i.test(m)) return "Un compte existe déjà avec cet email : connecte-toi.";
  if (/Password should be/i.test(m)) return "Mot de passe trop court (6 caractères minimum).";
  if (/relation .* does not exist/i.test(m)) return "Les tables n'existent pas encore : lance supabase/schema.sql dans Supabase.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Pas de connexion internet. Réessaie dans un instant.";
  return m || "Erreur inconnue.";
}
