// =====================================================================
// CONFIGURAÇÃO DO SUPABASE — Homologação Alívio de Tensão
// Este repositório usa APENAS o projeto Supabase de Alívio de Tensão (o novo).
// Onde achar (caso troque): Supabase > Project Settings > API Keys.
//
// A chave "publishable" (sb_publishable_...) é PÚBLICA por natureza e pode ficar
// no navegador / no repositório. Quem protege os dados é o RLS (Row Level Security),
// definido em sql/schema.sql.
//
// NUNCA coloque aqui a chave "secret" (sb_secret_...) nem a antiga "service_role":
// elas ignoram o RLS e dão acesso total ao banco.
// =====================================================================
window.SUPABASE_CONFIG = {
  url: "https://zupiomlphokfpuufzyog.supabase.co",
  publishableKey: "sb_publishable_4xMPd74xmky0Uo-omUG89Q_C5jZuL88"
};
