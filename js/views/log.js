// Onglet "Séance" : noter les charges et reps de la séance du jour.
import { h, today, dateShort, dateLong, num, fr, UNITS, formatSets, storageGet, storageSet, debounce, WEEKDAYS } from "../utils.js";
import { seedProgram } from "../seed.js";

export function renderLog(root, ctx) {
  const { state } = ctx;
  const ui = state.log;
  const workouts = state.workouts;
  const exById = Object.fromEntries(state.exercises.map((e) => [e.id, e]));

  if (!workouts.length) {
    root.append(emptyProgram(ctx));
    return;
  }

  if (!ui.date) ui.date = today();
  if (!workouts.some((w) => w.id === ui.workoutId)) {
    const wd = new Date().getDay();
    ui.workoutId = (workouts.find((w) => w.weekday === wd) || workouts.find((w) => w.weekday > wd) || workouts[0]).id;
  }
  const workout = workouts.find((w) => w.id === ui.workoutId);
  const existing = state.sessions.find((s) => s.date === ui.date && s.workout_id === workout.id);
  const draftKey = `draft:${ui.date}:${workout.id}`;
  const byId = (id) => root.querySelector("#" + CSS.escape(id));

  // --- sélection de séance + date
  const chips = h("div", { class: "chips", role: "group", "aria-label": "Séance" },
    workouts.map((w) => h("button", {
      type: "button", class: "chip-btn", "aria-pressed": String(w.id === workout.id),
      onclick: () => { ui.workoutId = w.id; ctx.render(); },
    },
    h("small", {}, w.weekday != null ? WEEKDAYS[w.weekday] : "—"),
    h("b", {}, w.name),
    h("small", {}, w.focus || ""))));

  const dateInput = h("input", { type: "date", id: "log-date", value: ui.date,
    onchange: (e) => { if (e.target.value) { ui.date = e.target.value; ctx.render(); } } });

  const meta = h("div", { class: "row between" },
    h("label", { class: "field-label", for: "log-date" }, "Date ", dateInput),
    existing ? h("span", { class: "tag" }, "Déjà enregistrée : tu la modifies") : null);

  // --- cartes d'exercices
  const cards = h("div", { class: "stack" });
  const items = workout.items || [];
  if (!items.length) {
    cards.append(h("div", { class: "card empty" },
      "Cette séance n'a pas encore d'exercices. ",
      h("button", { class: "link", onclick: () => ctx.go("programme") }, "Ajoute-les dans Programme.")));
  }

  items.forEach((it, idx) => {
    const ex = exById[it.exercise_id];
    if (!ex) return;
    const u = UNITS[ex.unit] || UNITS.kg;
    const last = lastFor(state.sessions, ex.id, ui.date, workout.id);
    const lastSets = last ? last.entries[ex.id] : [];

    const target = `${it.sets} × ${it.rep_min}${it.rep_max !== it.rep_min ? "-" + it.rep_max : ""}${ex.unit === "time" ? " s" : ""}${it.note ? " " + it.note : ""}${it.rest ? " · repos " + it.rest : ""}`;

    const setRows = [];
    for (let i = 0; i < it.sets; i++) {
      const prev = lastSets[i] || {};
      const rowCls = u.load ? "set" : "set single";
      setRows.push(h("div", { class: rowCls },
        h("span", { class: "set-n" }, "Série " + (i + 1)),
        u.load ? h("div", { class: "unit-field" },
          h("input", { id: `w-${idx}-${i}`, inputmode: "decimal", autocomplete: "off",
            placeholder: prev.w != null ? fr(prev.w) : "", "aria-label": `${ex.name}, charge série ${i + 1}` }),
          h("em", {}, u.load)) : null,
        u.load ? h("i", {}, "×") : null,
        h("div", { class: "unit-field" },
          h("input", { id: `r-${idx}-${i}`, inputmode: "numeric", autocomplete: "off",
            placeholder: prev.r != null ? fr(prev.r) : String(it.rep_min), "aria-label": `${ex.name}, ${u.reps} série ${i + 1}` }),
          h("em", {}, u.reps))));
    }

    let hint = null;
    if (last) {
      const done = lastSets.slice(0, it.sets);
      const hit = done.length >= it.sets && done.every((s) => s && s.r != null && s.r >= it.rep_max);
      hint = hit
        ? h("span", { class: "pill good" }, ex.unit === "time" ? "Objectif atteint : ajoute 5 s ou une variante plus dure"
          : ex.unit === "assist" ? "Objectif atteint : baisse l'assistance"
          : ex.unit === "bodyweight" ? "Objectif atteint : ajoute du lest ou une variante plus dure"
          : `Objectif atteint : monte la charge, repars à ${it.rep_min} reps`)
        : h("span", { class: "pill" }, ex.unit === "time" ? `Vise ${it.rep_max} s sur chaque série` : `Même charge, vise ${it.rep_max} reps partout`);
    }

    const card = h("article", { class: "card ex" },
      h("div", { class: "row between baseline" }, h("h3", {}, ex.name), h("span", { class: "muted small" }, target)),
      h("p", { class: "muted small last" }, last
        ? [`Dernière fois (${dateShort(last.date)}) : `, h("strong", {}, formatSets(ex.unit, lastSets))]
        : "Première fois : prends une charge où tu finis avec 2 reps en réserve."),
      hint,
      h("div", { class: "sets" }, setRows),
      last ? h("button", { type: "button", class: "link", onclick: () => { fillItem(idx, it, lastSets); saveDraft(); } },
        "Reprendre les valeurs de la dernière fois") : null);
    cards.append(card);
  });

  const note = h("textarea", { id: "log-note", placeholder: "Forme, sommeil, sensations…" });
  const noteCard = h("div", { class: "card" }, h("label", { class: "field-label", for: "log-note" }, "Notes de séance"), note);

  // --- barre d'enregistrement
  const msg = h("span", { class: "muted small", id: "save-msg" },
    ctx.store.mode === "local" ? "Mode local : données gardées sur cet appareil." : "Note tes séries puis enregistre.");
  const saveBtn = h("button", { class: "btn primary", type: "button", onclick: save }, "Enregistrer");
  const bar = h("div", { class: "savebar" }, h("div", { class: "savebar-in" }, msg, saveBtn));

  root.append(h("div", { class: "stack" }, chips, meta, cards, noteCard), bar);

  // --- remplissage : brouillon > séance enregistrée > vide
  const draft = storageGet(draftKey);
  const source = draft || existing;
  if (source) {
    items.forEach((it, idx) => fillItem(idx, it, (source.entries || {})[it.exercise_id] || []));
    note.value = source.note || "";
  }

  const saveDraft = debounce(() => {
    const data = collect();
    storageSet(draftKey, data.any || data.note ? { entries: data.entries, note: data.note } : null);
  }, 300);
  root.addEventListener("input", saveDraft);

  function fillItem(idx, it, sets) {
    for (let i = 0; i < it.sets; i++) {
      const s = sets[i] || {};
      const w = byId(`w-${idx}-${i}`);
      if (w) w.value = s.w != null ? fr(s.w) : "";
      byId(`r-${idx}-${i}`).value = s.r != null ? fr(s.r) : "";
    }
  }

  function collect() {
    const entries = {};
    let any = false;
    items.forEach((it, idx) => {
      if (!exById[it.exercise_id]) return;
      const sets = [];
      for (let i = 0; i < it.sets; i++) {
        const wEl = byId(`w-${idx}-${i}`);
        const w = wEl ? num(wEl.value) : null;
        const r = num(byId(`r-${idx}-${i}`).value);
        if (w != null || r != null) any = true;
        sets.push({ w, r });
      }
      if (sets.some((s) => s.w != null || s.r != null)) entries[it.exercise_id] = sets;
    });
    return { entries, note: note.value.trim(), any };
  }

  async function save() {
    const data = collect();
    if (!data.any) { msg.textContent = "Remplis au moins une série avant d'enregistrer."; return; }
    saveBtn.disabled = true; msg.textContent = "Enregistrement…";
    try {
      await ctx.store.saveSession({
        id: existing?.id, workout_id: workout.id, workout_name: workout.name,
        date: ui.date, entries: data.entries, note: data.note,
      });
      storageSet(draftKey, null);
      await ctx.reload();
      ctx.toast(`Séance du ${dateLong(ui.date)} enregistrée`);
      ctx.render();
    } catch (e) {
      msg.textContent = e.message || "Échec de l'enregistrement. Tes valeurs sont gardées, réessaie.";
      saveBtn.disabled = false;
    }
  }
}

export function lastFor(sessions, exId, beforeOrOn, excludeWorkoutId) {
  return sessions
    .filter((s) => s.entries && s.entries[exId] && s.date <= beforeOrOn && !(s.date === beforeOrOn && s.workout_id === excludeWorkoutId))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0] || null;
}

function emptyProgram(ctx) {
  const btn = h("button", { class: "btn primary", type: "button", onclick: async () => {
    btn.disabled = true; btn.textContent = "Import en cours…";
    try {
      await seedProgram(ctx.store, ctx.state.exercises);
      await ctx.reload(); ctx.toast("Programme importé"); ctx.render();
    } catch (e) { ctx.toast(e.message, "error"); btn.disabled = false; btn.textContent = "Importer le programme de départ"; }
  } }, "Importer le programme de départ");
  return h("div", { class: "card hero-empty" },
    h("h2", {}, "Ton programme est vide"),
    h("p", { class: "muted" }, "Importe le programme haut / bas en 4 séances (fessiers, jambes, dos) pour démarrer, ou crée tes propres séances. Tout reste modifiable."),
    h("div", { class: "row wrap" }, btn,
      h("button", { class: "btn", type: "button", onclick: () => ctx.go("programme") }, "Créer mes séances")));
}
