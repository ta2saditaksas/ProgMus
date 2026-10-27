// Onglet "Réglages" : compte, sauvegarde / restauration des données.
import { h, today } from "../utils.js";

export function renderSettings(root, ctx) {
  const { state, store } = ctx;
  const isLocal = store.mode === "local";

  const account = h("section", { class: "card stack" },
    h("h2", {}, "Compte et synchronisation"),
    isLocal
      ? h("p", {}, "Mode local : tes données restent dans ce navigateur, sur cet appareil. Pour les retrouver partout, branche Supabase (voir le README du dépôt), puis restaure ta sauvegarde ici.")
      : h("p", {}, "Connectée en tant que ", h("b", {}, state.user?.email || "—"), ". Tes séances sont synchronisées sur tous tes appareils."),
    !isLocal ? h("div", {}, h("button", { class: "btn", type: "button", onclick: async () => { await store.signOut(); } }, "Se déconnecter")) : null);

  // Export
  const exportBtn = h("button", { class: "btn", type: "button", onclick: () => {
    const data = { app: "carnet-muscu", version: 1, exported_at: new Date().toISOString(),
      exercises: state.exercises, workouts: state.workouts, sessions: state.sessions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `carnet-muscu-${today()}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } }, "Télécharger une sauvegarde");

  // Import
  const file = h("input", { type: "file", accept: "application/json,.json", id: "import-file" });
  const status = h("p", { class: "muted small" });
  const importBtn = h("button", { class: "btn", type: "button", onclick: async () => {
    const f = file.files[0];
    if (!f) { status.textContent = "Choisis d'abord un fichier de sauvegarde (.json)."; return; }
    importBtn.disabled = true; status.textContent = "Import en cours…";
    try {
      const data = JSON.parse(await f.text());
      if (data.app !== "carnet-muscu") throw new Error("Ce fichier n'est pas une sauvegarde du carnet.");
      const n = await importData(store, state, data);
      await ctx.reload();
      status.textContent = `Import terminé : ${n.exercises} exercices, ${n.workouts} séances types, ${n.sessions} séances.`;
      ctx.toast("Sauvegarde restaurée");
    } catch (e) {
      status.textContent = e instanceof SyntaxError ? "Fichier illisible : ce n'est pas un JSON valide." : e.message;
    } finally { importBtn.disabled = false; }
  } }, "Restaurer");

  const backup = h("section", { class: "card stack" },
    h("h2", {}, "Sauvegarde"),
    h("p", { class: "muted" }, "Télécharge toutes tes données dans un fichier. Il sert aussi à les transférer du mode local vers ton compte synchronisé."),
    h("div", {}, exportBtn),
    h("hr"),
    h("label", { class: "field", for: "import-file" }, h("span", {}, "Restaurer une sauvegarde (ajoute les données, sans rien effacer)"), file),
    h("div", {}, importBtn), status);

  root.append(h("div", { class: "stack lg" }, account, backup));
}

async function importData(store, state, data) {
  const exMap = {}, wkMap = {};
  const count = { exercises: 0, workouts: 0, sessions: 0 };
  for (const e of data.exercises || []) {
    const same = state.exercises.find((x) => x.name.toLowerCase() === String(e.name).toLowerCase());
    if (same) { exMap[e.id] = same.id; continue; }
    const saved = await store.saveExercise({ name: e.name, unit: e.unit || "kg", notes: e.notes || "", archived: !!e.archived });
    exMap[e.id] = saved.id; count.exercises++;
  }
  const basePos = state.workouts.length ? Math.max(...state.workouts.map((w) => w.position)) + 1 : 0;
  for (const [i, w] of (data.workouts || []).entries()) {
    const same = state.workouts.find((x) => x.name === w.name);
    if (same) { wkMap[w.id] = same.id; continue; }
    const saved = await store.saveWorkout({
      name: w.name, focus: w.focus || "", weekday: w.weekday ?? null, position: basePos + i,
      items: (w.items || []).filter((it) => exMap[it.exercise_id]).map((it) => ({ ...it, exercise_id: exMap[it.exercise_id] })),
    });
    wkMap[w.id] = saved.id; count.workouts++;
  }
  for (const s of data.sessions || []) {
    const entries = {};
    for (const [k, v] of Object.entries(s.entries || {})) if (exMap[k]) entries[exMap[k]] = v;
    const workout_id = s.workout_id ? wkMap[s.workout_id] || null : null;
    const existing = state.sessions.find((x) => x.date === s.date && x.workout_id === workout_id && workout_id);
    await store.saveSession({ id: existing?.id, workout_id, workout_name: s.workout_name || "", date: s.date, entries, note: s.note || "" });
    count.sessions++;
  }
  return count;
}
