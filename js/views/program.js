// Onglet "Programme" : créer, modifier, réordonner les séances et les exercices.
import { h, UNITS, WEEKDAYS, confirmButton } from "../utils.js";
import { seedProgram } from "../seed.js";

export function renderProgram(root, ctx) {
  const { state, store } = ctx;
  const ui = state.program;
  const library = state.exercises;
  const active = library.filter((e) => !e.archived).sort((a, b) => a.name.localeCompare(b.name, "fr"));

  // Enregistre une séance puis redessine la page.
  async function saveWorkout(w, message = "Séance enregistrée") {
    try { await store.saveWorkout(w); await ctx.reload(); ctx.toast(message); ctx.render(); }
    catch (e) { ctx.toast(e.message, "error"); }
  }
  async function move(list, i, dir) {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
  }

  // ---------- Séances ----------
  const workouts = [...state.workouts].sort((a, b) => a.position - b.position);

  const addWorkout = h("button", { class: "btn primary", type: "button", onclick: async () => {
    const pos = workouts.length ? Math.max(...workouts.map((w) => w.position)) + 1 : 0;
    try {
      const w = await store.saveWorkout({ name: "Nouvelle séance", focus: "", weekday: null, position: pos, items: [] });
      ui.open = w.id; await ctx.reload(); ctx.render();
    } catch (e) { ctx.toast(e.message, "error"); }
  } }, "+ Nouvelle séance");

  const head = h("div", { class: "row between wrap" },
    h("div", {}, h("h2", {}, "Mes séances"),
      h("p", { class: "muted small" }, "Touche une séance pour la modifier. Les changements sont enregistrés dès que tu quittes un champ.")),
    addWorkout);

  const list = h("div", { class: "stack" });
  if (!workouts.length) {
    const seedBtn = h("button", { class: "btn", type: "button", onclick: async () => {
      seedBtn.disabled = true;
      try { await seedProgram(store, library); await ctx.reload(); ctx.toast("Programme importé"); ctx.render(); }
      catch (e) { ctx.toast(e.message, "error"); seedBtn.disabled = false; }
    } }, "Importer le programme de départ");
    list.append(h("div", { class: "card empty" }, h("p", {}, "Aucune séance pour l'instant."), seedBtn));
  }

  workouts.forEach((w, wi) => {
    const open = ui.open === w.id;
    const items = (w.items || []).map((x) => ({ ...x }));
    const days = [1, 2, 3, 4, 5, 6, 0];

    const summary = h("button", { class: "wk-summary", type: "button", "aria-expanded": String(open),
      onclick: () => { ui.open = open ? null : w.id; ctx.render(); } },
      h("span", { class: "wk-day" }, w.weekday != null ? WEEKDAYS[w.weekday] : "—"),
      h("span", { class: "wk-title" }, h("b", {}, w.name), h("small", {}, `${w.focus ? w.focus + " · " : ""}${items.length} exercice${items.length > 1 ? "s" : ""}`)),
      h("span", { class: "chev", "aria-hidden": "true" }, open ? "▴" : "▾"));

    const card = h("article", { class: "card wk" + (open ? " open" : "") }, summary);

    if (open) {
      const field = (label, input) => h("label", { class: "field" }, h("span", {}, label), input);
      const name = h("input", { value: w.name, maxlength: 40, id: `wn-${w.id}`,
        onchange: (e) => e.target.value.trim() && saveWorkout({ ...w, name: e.target.value.trim() }) });
      const focus = h("input", { value: w.focus || "", maxlength: 60, id: `wf-${w.id}`, placeholder: "Ex. : fessiers",
        onchange: (e) => saveWorkout({ ...w, focus: e.target.value.trim() }) });
      const day = h("select", { id: `wd-${w.id}`, onchange: (e) => saveWorkout({ ...w, weekday: e.target.value === "" ? null : +e.target.value }) },
        h("option", { value: "" }, "Pas de jour fixe"),
        days.map((d) => h("option", { value: d, selected: w.weekday === d }, WEEKDAYS[d])));

      const meta = h("div", { class: "grid3" }, field("Nom", name), field("Objectif", focus), field("Jour", day));

      // Lignes d'exercices
      const rows = h("div", { class: "items" });
      items.forEach((it, i) => {
        const ex = library.find((e) => e.id === it.exercise_id);
        const update = (patch) => { items[i] = { ...items[i], ...patch }; saveWorkout({ ...w, items }); };
        const numIn = (key, label, min, max) => h("label", { class: "field tiny" }, h("span", {}, label),
          h("input", { type: "number", inputmode: "numeric", min, max, value: it[key], id: `${key}-${w.id}-${i}`,
            onchange: (e) => { const v = Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min)); update({ [key]: v }); } }));
        const exSel = h("select", { id: `ex-${w.id}-${i}`, "aria-label": "Exercice",
          onchange: (e) => update({ exercise_id: e.target.value }) },
          (ex && ex.archived ? [ex, ...active] : active).map((e) => h("option", { value: e.id, selected: e.id === it.exercise_id }, e.name)),
          !ex ? h("option", { value: "", selected: true }, "Exercice supprimé") : null);

        rows.append(h("div", { class: "item" },
          h("div", { class: "item-top" },
            h("span", { class: "item-n" }, String(i + 1)),
            exSel,
            h("div", { class: "item-acts" },
              h("button", { class: "icon", type: "button", "aria-label": "Monter", disabled: i === 0,
                onclick: () => { move(items, i, -1); saveWorkout({ ...w, items }, "Ordre mis à jour"); } }, "↑"),
              h("button", { class: "icon", type: "button", "aria-label": "Descendre", disabled: i === items.length - 1,
                onclick: () => { move(items, i, 1); saveWorkout({ ...w, items }, "Ordre mis à jour"); } }, "↓"),
              h("button", { class: "icon danger", type: "button", "aria-label": "Retirer de la séance",
                onclick: () => { items.splice(i, 1); saveWorkout({ ...w, items }, "Exercice retiré"); } }, "✕"))),
          h("div", { class: "item-fields" },
            numIn("sets", "Séries", 1, 10),
            numIn("rep_min", ex && ex.unit === "time" ? "Min (s)" : "Reps min", 1, 300),
            numIn("rep_max", ex && ex.unit === "time" ? "Max (s)" : "Reps max", 1, 300),
            h("label", { class: "field mid" }, h("span", {}, "Repos"),
              h("input", { value: it.rest || "", id: `rest-${w.id}-${i}`, placeholder: "1 min 30", onchange: (e) => update({ rest: e.target.value.trim() }) })),
            h("label", { class: "field mid" }, h("span", {}, "Précision"),
              h("input", { value: it.note || "", id: `note-${w.id}-${i}`, placeholder: "par jambe", onchange: (e) => update({ note: e.target.value.trim() }) })))));
      });

      // Ajout d'un exercice
      const NEW = "__new__";
      const pick = h("select", { id: `add-${w.id}`, "aria-label": "Exercice à ajouter" },
        h("option", { value: "" }, "Choisir un exercice…"),
        active.map((e) => h("option", { value: e.id }, e.name)),
        h("option", { value: NEW }, "+ Créer un nouvel exercice"));
      const newName = h("input", { placeholder: "Nom du nouvel exercice", maxlength: 80, id: `newname-${w.id}`, hidden: true });
      const newUnit = h("select", { id: `newunit-${w.id}`, hidden: true },
        Object.entries(UNITS).map(([k, u]) => h("option", { value: k }, u.label)));
      pick.addEventListener("change", () => { const n = pick.value === NEW; newName.hidden = !n; newUnit.hidden = !n; if (n) newName.focus(); });

      const addBtn = h("button", { class: "btn", type: "button", onclick: async () => {
        let id = pick.value;
        if (!id) { pick.focus(); return; }
        try {
          if (id === NEW) {
            const nm = newName.value.trim();
            if (!nm) { newName.focus(); return; }
            id = (await store.saveExercise({ name: nm, unit: newUnit.value, notes: "", archived: false })).id;
          }
          const unit = id === pick.value ? (library.find((e) => e.id === id) || {}).unit : newUnit.value;
          items.push({ exercise_id: id, sets: 3, rep_min: unit === "time" ? 30 : 8, rep_max: unit === "time" ? 45 : 12, rest: "1 min 30", note: "" });
          await saveWorkout({ ...w, items }, "Exercice ajouté");
        } catch (e) { ctx.toast(e.message, "error"); }
      } }, "Ajouter");

      const adder = h("div", { class: "adder" }, pick, newName, newUnit, addBtn);

      const footer = h("div", { class: "row between wrap" },
        h("div", { class: "row" },
          h("button", { class: "btn ghost", type: "button", disabled: wi === 0, onclick: () => reorder(wi, -1) }, "↑ Monter la séance"),
          h("button", { class: "btn ghost", type: "button", disabled: wi === workouts.length - 1, onclick: () => reorder(wi, 1) }, "↓ Descendre")),
        confirmButton("Supprimer la séance", async () => {
          try { await store.deleteWorkout(w.id); ui.open = null; await ctx.reload(); ctx.toast("Séance supprimée. Ton historique est conservé."); ctx.render(); }
          catch (e) { ctx.toast(e.message, "error"); }
        }));

      card.append(h("div", { class: "wk-body stack" }, meta, rows, adder, footer));
    }
    list.append(card);
  });

  async function reorder(i, dir) {
    const arr = [...workouts];
    move(arr, i, dir);
    try {
      for (const [k, w] of arr.entries()) if (w.position !== k) await store.saveWorkout({ ...w, position: k });
      await ctx.reload(); ctx.render();
    } catch (e) { ctx.toast(e.message, "error"); }
  }

  // ---------- Bibliothèque d'exercices ----------
  const usedIn = (id) => state.workouts.filter((w) => (w.items || []).some((it) => it.exercise_id === id)).map((w) => w.name);
  const logged = (id) => state.sessions.some((s) => s.entries && s.entries[id]);

  const libRows = h("div", { class: "lib" });
  const sorted = [...library].sort((a, b) => (a.archived - b.archived) || a.name.localeCompare(b.name, "fr"));
  const visible = ui.showArchived ? sorted : sorted.filter((e) => !e.archived);
  visible.forEach((e) => {
    const used = usedIn(e.id);
    const save = async (patch, msg = "Exercice mis à jour") => {
      try { await store.saveExercise({ ...e, ...patch }); await ctx.reload(); ctx.toast(msg); ctx.render(); }
      catch (err) { ctx.toast(err.message, "error"); }
    };
    libRows.append(h("div", { class: "lib-row" + (e.archived ? " archived" : "") },
      h("div", { class: "lib-main" },
        h("input", { value: e.name, maxlength: 80, id: `ln-${e.id}`, "aria-label": "Nom de l'exercice",
          onchange: (ev) => ev.target.value.trim() && save({ name: ev.target.value.trim() }) }),
        h("span", { class: "muted small" }, used.length ? "Dans : " + used.join(", ") : "Utilisé dans aucune séance")),
      h("select", { id: `lu-${e.id}`, "aria-label": "Type de mesure", onchange: (ev) => save({ unit: ev.target.value }) },
        Object.entries(UNITS).map(([k, u]) => h("option", { value: k, selected: e.unit === k }, u.label))),
      h("div", { class: "row" },
        h("button", { class: "link", type: "button", onclick: () => save({ archived: !e.archived }, e.archived ? "Exercice restauré" : "Exercice archivé") },
          e.archived ? "Restaurer" : "Archiver"),
        !used.length && !logged(e.id)
          ? confirmButton("Supprimer", async () => {
              try { await store.deleteExercise(e.id); await ctx.reload(); ctx.toast("Exercice supprimé"); ctx.render(); }
              catch (err) { ctx.toast(err.message, "error"); }
            })
          : null)));
  });

  const newLibName = h("input", { id: "lib-new-name", placeholder: "Ex. : Hip abduction à la poulie", maxlength: 80 });
  const newLibUnit = h("select", { id: "lib-new-unit" }, Object.entries(UNITS).map(([k, u]) => h("option", { value: k }, u.label)));
  const libAdd = h("form", { class: "adder", onsubmit: async (ev) => {
    ev.preventDefault();
    const nm = newLibName.value.trim(); if (!nm) return;
    try { await store.saveExercise({ name: nm, unit: newLibUnit.value, notes: "", archived: false }); await ctx.reload(); ctx.toast("Exercice créé"); ctx.render(); }
    catch (err) { ctx.toast(err.message, "error"); }
  } }, newLibName, newLibUnit, h("button", { class: "btn", type: "submit" }, "Créer"));

  const archivedCount = library.filter((e) => e.archived).length;
  const libSection = h("section", { class: "stack" },
    h("div", { class: "row between wrap" },
      h("div", {}, h("h2", {}, "Mes exercices"),
        h("p", { class: "muted small" }, "Archive un exercice que tu ne fais plus : son historique reste dans Progrès.")),
      archivedCount ? h("button", { class: "link", type: "button", onclick: () => { ui.showArchived = !ui.showArchived; ctx.render(); } },
        ui.showArchived ? "Masquer les archivés" : `Voir les archivés (${archivedCount})`) : null),
    h("div", { class: "card stack" }, libAdd, libRows.childElementCount
      ? h("details", { class: "lib-wrap", open: ui.libOpen, ontoggle: (ev) => { ui.libOpen = ev.target.open; } },
          h("summary", {}, `Modifier mes ${visible.length} exercices`), libRows)
      : h("p", { class: "muted" }, "Aucun exercice.")));

  root.append(h("div", { class: "stack lg" }, h("section", { class: "stack" }, head, list), libSection));
}
