// Petites fonctions utilitaires partagées.

/** Crée un élément DOM : h("button", { class: "x", onclick }, "Texte", enfant) */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "value") el.value = v;
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);

export function today() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
export const parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const fLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
export const dateShort = (s) => fShort.format(parseDate(s));
export const dateLong = (s) => fLong.format(parseDate(s));

export const WEEKDAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/** "12,5" -> 12.5 ; "" -> null */
export function num(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
/** 12.5 -> "12,5" */
export const fr = (n) => (n == null ? "" : String(+(+n).toFixed(2)).replace(".", ","));

/** Unités d'exercice */
export const UNITS = {
  kg:         { label: "Charge (kg) × reps", load: "kg", reps: "reps" },
  assist:     { label: "Assistance (kg) × reps", load: "kg ass.", reps: "reps" },
  bodyweight: { label: "Poids du corps (reps)", load: null, reps: "reps" },
  time:       { label: "Durée (secondes)", load: null, reps: "s" },
};

export function formatSets(unit, sets = []) {
  const u = UNITS[unit] || UNITS.kg;
  return sets
    .filter((s) => s && (s.w != null || s.r != null))
    .map((s) => (u.load ? `${s.w != null ? fr(s.w) : "–"} × ${s.r ?? "–"}` : `${s.r ?? "–"}${unit === "time" ? " s" : ""}`))
    .join(" · ");
}

export function debounce(fn, ms = 400) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function storageGet(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } }
export function storageSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }

/** Bouton de suppression en deux temps (pas de confirm() bloquant) */
export function confirmButton(label, onConfirm, cls = "link danger") {
  const b = h("button", { type: "button", class: cls }, label);
  let armed = false, timer;
  b.addEventListener("click", async () => {
    if (!armed) {
      armed = true; b.textContent = "Confirmer ?";
      timer = setTimeout(() => { armed = false; b.textContent = label; }, 3500);
      return;
    }
    clearTimeout(timer); b.disabled = true;
    try { await onConfirm(); } finally { b.disabled = false; armed = false; b.textContent = label; }
  });
  return b;
}
