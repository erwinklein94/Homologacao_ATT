// Supabase Edge Function: admin-excluir-conta
// Exclui DEFINITIVAMENTE uma conta: remove o perfil desta área (cascateia as
// tentativas), apaga o cadastro em alunos_cadastrados e, se o usuário não
// tiver mais nenhum perfil em outra área, remove o usuário do Supabase Auth.
// Só um administrador da própria área pode chamar; não é possível excluir a
// própria conta.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizarEmail(email: unknown) {
  return String(email || "").trim().toLowerCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ ok: false, error: "Variáveis de ambiente do Supabase não configuradas na Edge Function." }, 500);
    }

    const authorization = req.headers.get("Authorization") || "";
    if (!authorization) {
      return json({ ok: false, error: "Sessão ausente. Faça login como administrador e tente novamente." }, 401);
    }

    const supabaseDoUsuario = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: dadosUsuario, error: erroUsuario } = await supabaseDoUsuario.auth.getUser();
    const adminLogado = dadosUsuario?.user;
    if (erroUsuario || !adminLogado) {
      return json({ ok: false, error: "Sessão inválida. Entre novamente como administrador." }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const area = body.area === "solda" ? "solda" : "alivio_tensao";
    const emailNormalizado = normalizarEmail(body.email);
    if (!emailNormalizado || !emailNormalizado.includes("@")) {
      return json({ ok: false, error: "Informe um e-mail válido." }, 400);
    }

    // Quem chama precisa ser administrador desta área.
    const { data: perfilAdmin, error: erroPerfilAdmin } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", adminLogado.id)
      .eq("area", area)
      .eq("role", "admin")
      .maybeSingle();
    if (erroPerfilAdmin) {
      return json({ ok: false, error: "Não consegui validar o perfil administrador: " + erroPerfilAdmin.message }, 500);
    }
    if (!perfilAdmin) {
      return json({ ok: false, error: "Apenas administrador desta área pode excluir contas." }, 403);
    }

    const usuarioAuth = await buscarUsuarioPorEmail(supabaseAdmin, emailNormalizado);

    // Não deixa o administrador excluir a própria conta.
    if (usuarioAuth && usuarioAuth.id === adminLogado.id) {
      return json({ ok: false, error: "Você não pode excluir a própria conta." }, 400);
    }

    // 1) Apaga o cadastro (autorização de prova / fila de solicitação) desta área.
    const { error: erroCad } = await supabaseAdmin
      .from("alunos_cadastrados")
      .delete()
      .eq("area", area)
      .eq("email_normalizado", emailNormalizado);
    if (erroCad) {
      return json({ ok: false, error: "Falhou ao apagar o cadastro: " + erroCad.message }, 500);
    }

    let authRemovido = false;
    if (usuarioAuth) {
      // 2) Remove o perfil desta área (cascateia as tentativas do aluno).
      const { error: erroPerfil } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", usuarioAuth.id)
        .eq("area", area);
      if (erroPerfil) {
        return json({ ok: false, error: "Falhou ao apagar o perfil: " + erroPerfil.message }, 500);
      }

      // 3) Se não sobrar nenhum perfil em outra área, apaga o usuário do Auth.
      const { data: restantes, error: erroRest } = await supabaseAdmin
        .from("profiles")
        .select("area")
        .eq("id", usuarioAuth.id);
      if (erroRest) {
        return json({ ok: false, error: "Falhou ao conferir perfis restantes: " + erroRest.message }, 500);
      }
      if (!restantes || restantes.length === 0) {
        const { error: erroDel } = await supabaseAdmin.auth.admin.deleteUser(usuarioAuth.id);
        if (erroDel) {
          return json({ ok: false, error: "Perfil apagado, mas falhou ao remover o usuário do Auth: " + erroDel.message }, 500);
        }
        authRemovido = true;
      }
    }

    return json({
      ok: true,
      email: emailNormalizado,
      auth_removido: authRemovido,
      tinha_conta: Boolean(usuarioAuth),
      message: usuarioAuth
        ? "Conta excluída com sucesso."
        : "Cadastro excluído (não havia acesso criado no Auth).",
    });
  } catch (err) {
    return json({ ok: false, error: "Erro inesperado na função: " + (err instanceof Error ? err.message : String(err)) }, 500);
  }
});

async function buscarUsuarioPorEmail(supabaseAdmin: any, emailNormalizado: string) {
  const porPagina = 1000;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: porPagina });
    if (error) throw new Error("Erro ao consultar usuários do Auth: " + error.message);
    const usuarios = data?.users || [];
    const encontrado = usuarios.find((u: any) => normalizarEmail(u.email) === emailNormalizado);
    if (encontrado) return encontrado;
    if (usuarios.length < porPagina) return null;
  }
  throw new Error("Não consegui localizar o usuário por e-mail: há muitos usuários no Auth.");
}
