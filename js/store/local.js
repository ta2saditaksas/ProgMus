// Stockage local (localStorage) : même interface que le stockage Supabase.

const KEY = "carnet-muscu:v1";

const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2));

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* stockage indisponible */ }
  return { exercises: [], workouts: [], sessions: [] };
}
function write(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { throw new Error("Impossible d'enregistrer : le stockage du navigateur est plein ou bloqué."); }
}
const clone = (x) => JSON.parse(JSON.stringify(x));

function upsert(table, row) {
  const db = read();
  const list = db[table];
  const r = clone(row);
  if (!r.id) r.id = uid();
  const i = list.findIndex((x) => x.id === r.id);
  if (i >= 0) list[i] = { ...list[i], ...r };
  else list.push(r);
  write(db);
  return clone(i >= 0 ? list[i] : r);
}
function remove(table, id) {
  const db = read();
  db[table] = db[table].filter((x) => x.id !== id);
  write(db);
}

export const localStore = {
  mode: "local",

  async getUser() { return { id: "local", email: null }; },
  onAuthChange() { return () => {}; },
  async signIn() {}, async signUp() {}, async signOut() {},

  async listExercises() { return clone(read().exercises); },
  async saveExercise(ex) { return upsert("exercises", ex); },
  async deleteExercise(id) { remove("exercises", id); },

  async listWorkouts() { return clone(read().workouts).sort((a, b) => a.position - b.position); },
  async saveWorkout(w) { return upsert("workouts", w); },
  async deleteWorkout(id) {
    const db = read();
    db.workouts = db.workouts.filter((x) => x.id !== id);
    db.sessions.forEach((s) => { if (s.workout_id === id) s.workout_id = null; });
    write(db);
  },

  async listSessions() { return clone(read().sessions); },
  async saveSession(s) {
    const db = read();
    const same = db.sessions.find((x) => x.date === s.date && x.workout_id === s.workout_id && x.id !== s.id);
    return upsert("sessions", { ...s, id: s.id || (same && same.id), updated_at: new Date().toISOString() });
  },
  async deleteSession(id) { remove("sessions", id); },
};
