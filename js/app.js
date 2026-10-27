// Point d'entrée : chargement des données, navigation par onglets (#seance, #programme…).
import { createStore } from "./store/index.js";
import { h, $ } from "./utils.js";
import { renderLog } from "./views/log.js";
import { renderProgram } from "./views/program.js";
import { renderProgress } from "./views/progress.js";
import { renderSettings } from "./views/settings.js";
import { renderAuth } from "./views/auth.js";

const VIEWS = {
  seance:    { label: "Séance",    render: renderLog },
  programme: { label: "Programme", render: renderProgram },
  progres:   { label: "Progrès",   render: renderProgress },
  reglages:  { label: "Réglages",  render: renderSettings },
};

const state = {
  user: null,
  exercises: [], workouts: [], sessions: [],
  view: "seance",
  log: { date: null, workoutId: null },
  program: { open: null, showArchived: false, libOpen: false },
  progress: { exerciseId: null, limit: 30 },
};

let store;
const main = $("#main");
const nav = $("#nav");
const badge = $("#mode");

const ctx = {
  state,
  get store() { return store; },
  render,
  go(view) { location.hash = view; },
  async reload() {
    const [exercises, workouts, sessions] = await Promise.all([
      store.listExercises(), store.listWorkouts(), store.listSessions(),
    ]);
    Object.assign(state, { exercises, workouts, sessions });
  },
  toast,
};

function toast(message, kind = "ok") {
  const el = h("div", { class: "toast " + kind, role: "status" }, message);
  $("#toasts").append(el);
  setTimeout(() => el.classList.add("out"), 2600);
  setTimeout(() => el.remove(), 3000);
}

function render() {
  const view = h("div", { class: "view" });
  const needsLogin = store.mode === "supabase" && !state.user;
  nav.hidden = needsLogin;
  if (needsLogin) renderAuth(view, ctx);
  else {
    nav.querySelectorAll("a").forEach((a) => a.setAttribute("aria-current", a.dataset.view === state.view ? "page" : "false"));
    VIEWS[state.view].render(view, ctx);
  }
  main.replaceChildren(view);
}

function route() {
  const v = location.hash.slice(1);
  const next = VIEWS[v] ? v : "seance";
  if (next !== state.view) { state.view = next; window.scrollTo(0, 0); }
  render();
}

async function start() {
  nav.replaceChildren(...Object.entries(VIEWS).map(([k, v]) => h("a", { href: "#" + k, dataset: { view: k } }, v.label)));
  try {
    store = await createStore();
  } catch (e) {
    main.replaceChildren(h("div", { class: "card" }, "Impossible de charger le module de connexion. Vérifie ta connexion internet puis recharge la page."));
    return;
  }
  badge.textContent = store.mode === "local" ? "Mode local" : "Synchronisé";
  badge.className = "badge " + store.mode;

  state.user = await store.getUser();
  if (state.user) await safeReload();

  store.onAuthChange(async (user) => {
    const changed = (user && user.id) !== (state.user && state.user.id);
    state.user = user;
    if (!changed) return;
    if (user) await safeReload();
    else Object.assign(state, { exercises: [], workouts: [], sessions: [] });
    render();
  });

  window.addEventListener("hashchange", route);
  route();
}

async function safeReload() {
  try { await ctx.reload(); }
  catch (e) { toast(e.message, "error"); }
}

start();
