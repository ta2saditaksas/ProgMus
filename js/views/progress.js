// Onglet "Progrès" : courbe par exercice + historique des séances.
import { h, fr, dateLong, formatSets, confirmButton } from "../utils.js";
import { lineChart } from "../chart.js";

export function renderProgress(root, ctx) {
  const { state, store } = ctx;
  const ui = state.progress;
  const exById = Object.fromEntries(state.exercises.map((e) => [e.id, e]));
  const loggedIds = new Set(state.sessions.flatMap((s) => Object.keys(s.entries || {})));
  const choices = state.exercises.filter((e) => loggedIds.has(e.id)).sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const panel = h("div", { class: "card stack" });
  if (!choices.length) {
    panel.append(h("h2", {}, "Ta progression"),
      h("p", { class: "muted" }, "Enregistre ta première séance : chaque exercice aura ensuite sa courbe ici, avec ta charge de départ et ta charge actuelle."));
  } else {
    if (!choices.some((e) => e.id === ui.exerciseId)) {
      const latest = [...state.sessions].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      const w = latest && state.workouts.find((x) => x.id === latest.workout_id);
      const firstLogged = w && (w.items || []).map((it) => it.exercise_id).find((id) => latest.entries[id]);
      ui.exerciseId = firstLogged || choices[0].id;
    }
    const ex = exById[ui.exerciseId];
    const sel = h("select", { id: "prog-ex", onchange: (e) => { ui.exerciseId = e.target.value; ctx.render(); } },
      choices.map((e) => h("option", { value: e.id, selected: e.id === ex.id }, e.name + (e.archived ? " (archivé)" : ""))));

    const rows = state.sessions.filter((s) => s.entries && s.entries[ex.id]).sort((a, b) => (a.date < b.date ? -1 : 1));
    const useLoad = (ex.unit === "kg" || ex.unit === "assist") && rows.some((s) => s.entries[ex.id].some((x) => x.w > 0));
    const pts = rows.map((s) => {
      const sets = s.entries[ex.id];
      const value = useLoad ? Math.max(...sets.map((x) => x.w || 0)) : Math.max(...sets.map((x) => x.r || 0));
      return { date: s.date, value, label: formatSets(ex.unit, sets) };
    });
    const unitShort = useLoad ? "kg" : ex.unit === "time" ? "s" : "reps";
    const first = pts[0].value, last = pts[pts.length - 1].value, diff = +(last - first).toFixed(2);
    const better = ex.unit === "assist" ? diff < 0 : diff > 0;

    const stat = (label, value, cls = "") => h("div", { class: "stat" }, h("small", {}, label), h("b", { class: cls }, value));
    panel.append(
      h("label", { class: "field" }, h("span", {}, "Exercice"), sel),
      h("div", { class: "stats" },
        stat("Départ", `${fr(first)} ${unitShort}`),
        stat("Actuel", `${fr(last)} ${unitShort}`),
        stat("Évolution", `${diff > 0 ? "+" : ""}${fr(diff)} ${unitShort}`, better ? "good" : ""),
        stat("Séances", String(pts.length))));

    const chart = h("div", { class: "chart" });
    chart.innerHTML = lineChart(pts, {
      yLabel: useLoad ? (ex.unit === "assist" ? "kg d'assistance (série la plus lourde)" : "kg (série la plus lourde)")
        : ex.unit === "time" ? "secondes (meilleure série)" : "reps (meilleure série)",
    });
    panel.append(chart, h("p", { class: "muted small" }, ex.unit === "assist"
      ? "Moins d'assistance = plus forte : la courbe doit descendre."
      : "Une courbe en escalier est normale : la charge monte, les reps redescendent, puis remontent."));

    // dernières séances de cet exercice
    const recent = [...rows].reverse().slice(0, 6);
    panel.append(h("ul", { class: "mini-list" }, recent.map((s) =>
      h("li", {}, h("span", { class: "muted" }, dateLong(s.date)), h("span", { class: "num" }, formatSets(ex.unit, s.entries[ex.id]))))));
  }

  // ---------- Historique ----------
  const hist = h("ul", { class: "hist" });
  const sessions = [...state.sessions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (!sessions.length) hist.append(h("li", { class: "muted" }, "Aucune séance enregistrée pour l'instant."));
  sessions.slice(0, ui.limit).forEach((s) => {
    const w = state.workouts.find((x) => x.id === s.workout_id);
    const nSets = Object.values(s.entries || {}).reduce((a, arr) => a + arr.filter((x) => x.r != null).length, 0);
    hist.append(h("li", {},
      h("div", { class: "hist-main" },
        h("b", {}, dateLong(s.date)),
        h("small", { class: "muted" }, `${w ? w.name : s.workout_name || "Séance supprimée"} · ${nSets} séries${s.note ? " · " + s.note : ""}`)),
      h("div", { class: "row" },
        w ? h("button", { class: "link", type: "button", onclick: () => { state.log.date = s.date; state.log.workoutId = w.id; ctx.go("seance"); } }, "Ouvrir") : null,
        confirmButton("Supprimer", async () => {
          try { await store.deleteSession(s.id); await ctx.reload(); ctx.toast("Séance supprimée"); ctx.render(); }
          catch (e) { ctx.toast(e.message, "error"); }
        }))));
  });
  const more = sessions.length > ui.limit
    ? h("button", { class: "link", type: "button", onclick: () => { ui.limit += 30; ctx.render(); } }, "Afficher plus")
    : null;

  root.append(h("div", { class: "stack lg" }, panel,
    h("section", { class: "card stack" }, h("h2", {}, "Historique"), hist, more)));
}

