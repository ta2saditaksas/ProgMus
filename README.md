# Carnet de muscu

Mon carnet d'entraînement en ligne : je note mes charges et mes reps à chaque séance, je modifie mon programme quand je veux, et je suis ma progression exercice par exercice.

Site statique (HTML, CSS, JavaScript sans framework), hébergé sur GitHub Pages. Les données sont stockées dans **Supabase** (base Postgres + comptes utilisateurs), ou dans le navigateur en **mode local** si Supabase n'est pas configuré.

## Fonctionnalités

- **Séance** : choisir la séance du jour, noter kg × reps par série, voir ce que j'ai fait la dernière fois et quand monter la charge (double progression).
- **Programme** : créer, renommer, réordonner et supprimer des séances ; ajouter, retirer et réordonner des exercices ; régler séries, fourchette de reps, repos et précisions (« par jambe »…) ; gérer la bibliothèque d'exercices (archiver ceux que je ne fais plus).
- **Progrès** : courbe par exercice (charge de la série la plus lourde, ou reps / secondes), départ, actuel, évolution, historique complet.
- **Réglages** : sauvegarde et restauration en JSON, déconnexion.
- Types d'exercices : charge (kg × reps), assistance (tractions assistées : moins = mieux), poids du corps (reps), durée (secondes).

## Mise en ligne

### 1. GitHub Pages

1. Sur GitHub, dans le dépôt : **Settings → Pages**.
2. *Source* : **Deploy from a branch**, branche **main**, dossier **/ (root)**, puis **Save**.
3. Après une minute environ, le site est en ligne sur `https://<pseudo>.github.io/<nom-du-depot>/`.

À ce stade, le site fonctionne en **mode local** : les données restent dans le navigateur de chaque appareil.

### 2. Supabase (synchronisation entre appareils)

1. Crée un compte sur [supabase.com](https://supabase.com), puis un projet (région Europe).
2. **SQL Editor → New query** : colle le contenu de [`supabase/schema.sql`](supabase/schema.sql) puis **Run**. Ça crée les 3 tables et les règles de sécurité.
3. **Authentication → URL Configuration** :
   - *Site URL* : `https://<pseudo>.github.io/<nom-du-depot>/`
   - *Redirect URLs* : ajoute la même adresse.
4. **Project Settings → API** : copie *Project URL* et la clé *anon public*.
5. Colle-les dans [`js/config.js`](js/config.js), puis commit et push.
6. Ouvre le site, crée ton compte, confirme l'email reçu, puis connecte-toi.

Si tu as déjà noté des séances en mode local : avant l'étape 5, va dans **Réglages → Télécharger une sauvegarde**. Une fois connectée, utilise **Réglages → Restaurer**.

### Sécurité

- La clé *anon* est publique par conception. Ce qui protège les données, ce sont les règles **Row Level Security** du schéma : chaque utilisatrice ne lit et n'écrit que ses propres lignes (`user_id = auth.uid()`).
- Ne mets **jamais** la clé `service_role` dans ce dépôt : elle contourne RLS.
- Pour être la seule à pouvoir créer un compte, après avoir créé le tien : **Authentication → Sign In / Providers → Email**, désactive *Allow new users to sign up*.

## Développement local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Structure

```
index.html            page unique
css/style.css         styles (thème clair et sombre)
js/app.js             navigation par onglets (#seance, #programme, #progres, #reglages)
js/config.js          connexion Supabase (vide = mode local)
js/store/             stockage : local.js et supabase.js exposent la même interface
js/views/             un fichier par onglet + écran de connexion
js/seed.js            programme de départ (haut / bas, 4 séances)
js/chart.js           courbe de progression en SVG
supabase/schema.sql   tables + règles RLS
```

Pour ajouter un autre stockage (Firebase, une API à toi…), il suffit d'écrire un module qui expose les mêmes fonctions que `js/store/local.js` et de le brancher dans `js/store/index.js`.
