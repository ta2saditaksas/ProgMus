// Écran de connexion (mode Supabase uniquement).
import { h } from "../utils.js";

export function renderAuth(root, ctx) {
  let mode = "login";
  const email = h("input", { type: "email", id: "auth-email", autocomplete: "email", required: true });
  const pass = h("input", { type: "password", id: "auth-pass", autocomplete: "current-password", minlength: 6, required: true });
  const msg = h("p", { class: "muted small", role: "status" });
  const submit = h("button", { class: "btn primary", type: "submit" }, "Se connecter");
  const toggle = h("button", { class: "link", type: "button", onclick: () => {
    mode = mode === "login" ? "signup" : "login";
    submit.textContent = mode === "login" ? "Se connecter" : "Créer mon compte";
    toggle.textContent = mode === "login" ? "Pas encore de compte ? Créer un compte" : "J'ai déjà un compte";
    pass.autocomplete = mode === "login" ? "current-password" : "new-password";
    msg.textContent = "";
  } }, "Pas encore de compte ? Créer un compte");

  const form = h("form", { class: "card stack auth", onsubmit: async (e) => {
    e.preventDefault();
    submit.disabled = true; msg.textContent = mode === "login" ? "Connexion…" : "Création du compte…";
    try {
      if (mode === "login") await ctx.store.signIn(email.value.trim(), pass.value);
      else {
        const r = await ctx.store.signUp(email.value.trim(), pass.value);
        msg.textContent = r.needsConfirmation
          ? "Compte créé. Ouvre le lien reçu par email pour le confirmer, puis connecte-toi."
          : "Compte créé.";
      }
    } catch (err) { msg.textContent = err.message; }
    finally { submit.disabled = false; }
  } },
    h("h2", {}, "Connexion"),
    h("p", { class: "muted" }, "Connecte-toi pour retrouver tes séances sur tous tes appareils."),
    h("label", { class: "field" }, h("span", {}, "Email"), email),
    h("label", { class: "field" }, h("span", {}, "Mot de passe"), pass),
    submit, toggle, msg);

  root.append(form);
}
