// Programme de départ : haut / bas, 4 séances, débutante, priorité fessiers, jambes, dos.
// Importé une fois depuis l'onglet Programme ; tout reste modifiable ensuite.

const EXERCISES = {
  "hip-thrust":      ["Hip thrust à la barre", "kg"],
  "goblet-squat":    ["Goblet squat", "kg"],
  "bulgarian":       ["Fentes bulgares", "kg"],
  "leg-curl":        ["Leg curl assis", "kg"],
  "abduction":       ["Abduction machine", "kg"],
  "lat-pulldown":    ["Tirage vertical", "kg"],
  "seated-row":      ["Rowing assis à la poulie", "kg"],
  "incline-press":   ["Développé incliné haltères", "kg"],
  "lat-raise":       ["Élévations latérales", "kg"],
  "face-pull":       ["Face pull à la poulie", "kg"],
  "plank":           ["Gainage", "time"],
  "rdl":             ["Soulevé de terre roumain", "kg"],
  "leg-press":       ["Presse à cuisses, pieds hauts", "kg"],
  "back-ext":        ["Extension lombaire 45°", "kg"],
  "kickback":        ["Kickback à la poulie", "kg"],
  "leg-ext":         ["Leg extension", "kg"],
  "calf":            ["Mollets debout", "kg"],
  "db-row":          ["Rowing un bras haltère", "kg"],
  "assisted-pullup": ["Tractions assistées", "assist"],
  "shoulder-press":  ["Développé militaire haltères", "kg"],
  "pullover":        ["Pull-over poulie haute", "kg"],
  "glute-bridge":    ["Hip thrust léger / glute bridge", "kg"],
};

const WORKOUTS = [
  { name: "Bas A", focus: "Fessiers", weekday: 1, items: [
    ["hip-thrust", 3, 8, 12, "2 min"], ["goblet-squat", 3, 8, 10, "2 min"],
    ["bulgarian", 3, 8, 12, "1 min 30", "par jambe"], ["leg-curl", 3, 10, 12, "1 min 30"],
    ["abduction", 3, 15, 20, "1 min"]] },
  { name: "Haut A", focus: "Dos", weekday: 2, items: [
    ["lat-pulldown", 3, 8, 12, "2 min"], ["seated-row", 3, 10, 12, "1 min 30"],
    ["incline-press", 3, 8, 12, "1 min 30"], ["lat-raise", 3, 12, 15, "1 min"],
    ["face-pull", 3, 12, 15, "1 min"], ["plank", 3, 30, 45, "45 s"]] },
  { name: "Bas B", focus: "Fessiers + ischios", weekday: 4, items: [
    ["rdl", 3, 8, 10, "2 min"], ["leg-press", 3, 10, 12, "2 min"],
    ["back-ext", 3, 12, 15, "1 min 30"], ["kickback", 3, 12, 15, "1 min", "par jambe"],
    ["leg-ext", 2, 12, 15, "1 min"], ["calf", 3, 12, 15, "1 min"]] },
  { name: "Haut B", focus: "Dos + épaules", weekday: 5, items: [
    ["db-row", 3, 8, 12, "1 min 30", "par bras"], ["assisted-pullup", 3, 6, 10, "2 min"],
    ["shoulder-press", 3, 8, 12, "1 min 30"], ["pullover", 2, 12, 15, "1 min"],
    ["lat-raise", 3, 12, 15, "1 min"], ["glute-bridge", 2, 12, 15, "1 min"]] },
];

export async function seedProgram(store, existingExercises = []) {
  const ids = {};
  for (const [key, [name, unit]] of Object.entries(EXERCISES)) {
    const found = existingExercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
    ids[key] = found ? found.id : (await store.saveExercise({ name, unit, notes: "", archived: false })).id;
  }
  const start = Date.now() % 1000;
  for (const [i, w] of WORKOUTS.entries()) {
    await store.saveWorkout({
      name: w.name, focus: w.focus, weekday: w.weekday, position: start + i,
      items: w.items.map(([k, sets, rep_min, rep_max, rest, note]) => ({
        exercise_id: ids[k], sets, rep_min, rep_max, rest, note: note || "",
      })),
    });
  }
}
