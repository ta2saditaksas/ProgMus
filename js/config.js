// Connexion à Supabase.
// Laisse ces deux valeurs vides pour utiliser le site en mode local
// (les données restent alors dans le navigateur de chaque appareil).
//
// Pour activer la synchronisation entre appareils, colle ici les valeurs de
// Supabase > Project Settings > API : "Project URL" et la clé "anon public".
// La clé anon est faite pour être publique : ce sont les règles RLS de
// supabase/schema.sql qui protègent tes données.

export const SUPABASE_URL = "https://cjldaahljurkqtxizodv.supabase.co/rest/v1/";
export const SUPABASE_ANON_KEY = "";
