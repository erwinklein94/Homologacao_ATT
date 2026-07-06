// Supabase Edge Function: admin-criar-aluno
// Cria/atualiza usuário no Supabase Auth com senha inicial definida pelo administrador.
// Também mantém public.profiles e public.alunos_cadastrados sincronizadas.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Restrinja a origem em produção: no Supabase, em Edge Functions > Secrets,
// defina ALLOWED_ORIGIN com a URL do site (ex.: https://usuario.github.io).
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

function limparTexto(valor: unknown) {
  return String(valor || "").trim();
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
    const nome = limparTexto(body.nome);
    const matricula = limparTexto(body.matricula) || null;
    const email = limparTexto(body.email);
    const emailNormalizado = normalizarEmail(email);
    const empresa = limparTexto(body.empresa) || null;
    const funcao = limparTexto(body.funcao);
    const local = limparTexto(body.local);
    const gerencia = limparTexto(body.gerencia);
    const modalidade = limparTexto(body.modalidade);
    const instrutor = limparTexto(body.instrutor);
    const especificacao = limparTexto(body.especificacao);
    const senha = typeof body.senha === "string" ? body.senha : "";
    const ativo = body.ativo !== false;

    if (!nome) return json({ ok: false, error: "Informe o nome do aluno." }, 400);
    if (!emailNormalizado || !emailNormalizado.includes("@")) {
      return json({ ok: false, error: "Informe um e-mail válido." }, 400);
    }
    if (senha && senha.length < 6) {
      return json({ ok: false, error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
    }

    const { data: perfilAdmin, error: erroPerfilAdmin } = await supabaseAdmin
      .from("profiles")
      .select("id, area, role")
      .eq("id", adminLogado.id)
      .eq("area", area)
      .eq("role", "admin")
      .maybeSingle();

    if (erroPerfilAdmin) {
      return json({ ok: false, error: "Não consegui validar o perfil administrador: " + erroPerfilAdmin.message }, 500);
    }
    if (!perfilAdmin) {
      return json({ ok: false, error: "Apenas administrador desta área pode cadastrar aluno com senha." }, 403);
    }

    // IMPORTANTE: grava o cadastro ANTES de criar o usuário no Auth.
    // O gatilho handle_new_user (sql/atualizacao-seguranca.sql) só permite
    // criar usuário cujo e-mail já esteja cadastrado e ativo nesta lista.
    const { error: erroCadastro } = await supabaseAdmin
      .from("alunos_cadastrados")
      .upsert({
        area,
        nome,
        matricula,
        email,
        email_normalizado: emailNormalizado,
        empresa,
        funcao,
        local,
        gerencia,
        modalidade,
        instrutor,
        especificacao,
        ativo,
        criado_por: adminLogado.id,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: "area,email_normalizado" });

    if (erroCadastro) {
      return json({ ok: false, error: "Falhou ao salvar a lista de alunos: " + erroCadastro.message }, 500);
    }

    const usuarioExistente = await buscarUsuarioPorEmail(supabaseAdmin, emailNormalizado);
    let usuarioAuth = usuarioExistente;
    let usuarioFoiCriado = false;

    // Cadastro inativo: mantém a lista atualizada, mas não cria acesso novo.
    if (!usuarioExistente && !ativo) {
      return json({
        ok: true,
        created: false,
        email: emailNormalizado,
        message: "Aluno salvo como INATIVO. O acesso no Auth só será criado quando o cadastro estiver ativo.",
      });
    }

    if (!usuarioExistente) {
      if (senha.length < 6) {
        return json({ ok: false, error: "Para novo aluno, informe uma senha inicial com pelo menos 6 caracteres." }, 400);
      }

      const { data: novo, error: erroCriar } = await supabaseAdmin.auth.admin.createUser({
        email: emailNormalizado,
        password: senha,
        email_confirm: true,
        user_metadata: { nome, matricula, empresa, funcao, local, gerencia, modalidade, instrutor, especificacao, area },
      });

      if (erroCriar || !novo?.user) {
        return json({ ok: false, error: "Erro ao criar usuário no Auth: " + (erroCriar?.message || "sem detalhe") }, 400);
      }

      usuarioAuth = novo.user;
      usuarioFoiCriado = true;
    } else {
      const atributos: Record<string, unknown> = {
        email_confirm: true,
        user_metadata: {
          ...(usuarioExistente.user_metadata || {}),
          nome,
          matricula,
          empresa,
          funcao,
          local,
          gerencia,
          modalidade,
          instrutor,
          especificacao,
          area,
        },
      };

      if (senha) atributos.password = senha;

      const { data: atualizado, error: erroAtualizar } = await supabaseAdmin.auth.admin.updateUserById(
        usuarioExistente.id,
        atributos,
      );

      if (erroAtualizar || !atualizado?.user) {
        return json({ ok: false, error: "Erro ao atualizar usuário no Auth: " + (erroAtualizar?.message || "sem detalhe") }, 400);
      }

      usuarioAuth = atualizado.user;
    }

    const userId = usuarioAuth.id;

    // Preserva o papel de quem já tem perfil: editar os dados de um
    // administrador não pode rebaixá-lo para aluno.
    const { data: perfilExistente } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .eq("area", area)
      .maybeSingle();

    const { error: erroProfile } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        nome,
        matricula,
        email,
        email_normalizado: emailNormalizado,
        empresa,
        area,
        role: perfilExistente?.role || "aluno",
      }, { onConflict: "id,area" });

    if (erroProfile) {
      return json({ ok: false, error: "Usuário criado/atualizado no Auth, mas falhou ao salvar profile: " + erroProfile.message }, 500);
    }

    return json({
      ok: true,
      user_id: userId,
      email: emailNormalizado,
      created: usuarioFoiCriado,
      message: usuarioFoiCriado
        ? "Aluno criado no Supabase Auth e liberado para login."
        : (senha ? "Aluno atualizado e senha redefinida." : "Aluno atualizado."),
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
  throw new Error("Não consegui localizar o usuário por e-mail porque há muitos usuários no Auth. Ajuste a função para busca paginada maior.");
}
