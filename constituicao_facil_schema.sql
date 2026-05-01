-- ============================================================
-- ConstituiçãoFácil — Schema Supabase
-- Versão 1.0 · compatível com PostgreSQL 15 + pgcrypto
-- ============================================================

-- Extensões
create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- ============================================================
-- ENUMS
-- ============================================================

create type banca_enum as enum ('CESPE', 'FCC', 'VUNESP', 'GERADO_IA');
create type nivel_enum as enum ('facil', 'medio', 'dificil');
create type gabarito_enum as enum ('certo', 'errado');   -- padrão CESPE
create type plano_enum as enum ('gratis', 'cidadao', 'concurseiro', 'cursinho');
create type cargo_area as enum ('federal', 'estadual', 'judiciario', 'policial', 'outro');

-- ============================================================
-- TABELA: artigos
-- 250 artigos da CF/88 + versão simplificada
-- ============================================================

create table artigos (
  id           uuid primary key default gen_random_uuid(),
  numero       int  not null,                        -- 5, 37, 196…
  titulo_num   int,                                  -- Título I = 1, II = 2…
  capitulo_num int,
  secao_num    int,
  ementa       text not null,                        -- "Direitos e garantias fundamentais"
  texto_original text not null,                      -- texto literal da CF
  texto_simples  text,                               -- versão simplificada (gerada ou manual)
  palavras_chave text[],                             -- ['igualdade','direitos individuais']
  atualizado_em  timestamptz default now(),
  unique (numero)
);

-- ============================================================
-- TABELA: incisos
-- Incisos, alíneas e parágrafos dos artigos
-- ============================================================

create table incisos (
  id          uuid primary key default gen_random_uuid(),
  artigo_id   uuid not null references artigos(id) on delete cascade,
  identificador text not null,   -- 'I', 'II', '§1º', 'a)', 'parágrafo único'
  texto_original text not null,
  texto_simples  text,
  ordem       int  not null
);

-- ============================================================
-- TABELA: concursos
-- Catálogo de concursos com peso de dir. constitucional
-- ============================================================

create table concursos (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,   -- 'prf-2024', 'pf-delegado-2025'
  nome            text not null,          -- 'PRF — Policial Rodoviário Federal'
  orgao           text not null,          -- 'Departamento de Polícia Rodoviária Federal'
  banca           banca_enum not null,
  area            cargo_area not null,
  nivel_formacao  text,                   -- 'Nível superior', 'Pós-graduação'
  peso_const_pct  numeric(5,2),           -- % de Dir. Constitucional no edital
  edital_url      text,
  ativo           boolean default true,
  criado_em       timestamptz default now()
);

-- ============================================================
-- TABELA: concurso_assuntos
-- Distribuição % de cada assunto dentro de um concurso
-- ============================================================

create table concurso_assuntos (
  id           uuid primary key default gen_random_uuid(),
  concurso_id  uuid not null references concursos(id) on delete cascade,
  assunto      text not null,   -- 'Direitos fundamentais', 'Organização do Estado'…
  peso_pct     numeric(5,2),    -- 35.00, 25.00…
  artigos_ids  uuid[],          -- atalho para filtrar questões
  ordem        int default 0
);

-- ============================================================
-- TABELA: questoes
-- Banco de questões estilo CESPE (assertiva certo/errado)
-- e múltipla escolha para outras bancas
-- ============================================================

create table questoes (
  id              uuid primary key default gen_random_uuid(),
  concurso_id     uuid references concursos(id) on delete set null,
  artigo_id       uuid references artigos(id) on delete set null,
  inciso_id       uuid references incisos(id) on delete set null,
  banca           banca_enum not null,
  ano             int,
  cargo_ref       text,           -- 'Agente Administrativo', 'Delegado'…
  assunto         text,           -- 'Direitos fundamentais', 'Poder Judiciário'…
  nivel           nivel_enum not null default 'medio',
  enunciado       text not null,  -- texto do enunciado / contexto
  assertiva       text,           -- para CESPE: a frase a julgar
  gabarito_cespe  gabarito_enum,  -- para CESPE
  alternativas    jsonb,          -- para múltipla escolha: [{letra,texto,correta}]
  gabarito_letra  text,           -- 'A','B','C'… para múltipla escolha
  justificativa   text not null,  -- explicação do gabarito
  gerado_por_ia   boolean default false,
  revisado        boolean default false,
  ativo           boolean default true,
  criado_em       timestamptz default now()
);

-- index para filtros frequentes
create index idx_questoes_concurso  on questoes(concurso_id);
create index idx_questoes_artigo    on questoes(artigo_id);
create index idx_questoes_banca     on questoes(banca);
create index idx_questoes_assunto   on questoes(assunto);
create index idx_questoes_nivel     on questoes(nivel);

-- ============================================================
-- TABELA: casos_dia_a_dia
-- Situações cotidianas vinculadas a artigos
-- ============================================================

create table casos_dia_a_dia (
  id           uuid primary key default gen_random_uuid(),
  artigo_id    uuid not null references artigos(id) on delete cascade,
  inciso_id    uuid references incisos(id) on delete set null,
  titulo       text not null,       -- 'A escola pode proibir o cabelo do meu filho?'
  categoria    text not null,       -- 'escola', 'trabalho', 'saude', 'policia'
  situacao     text not null,       -- parágrafo narrativo da situação
  pergunta     text not null,       -- a dúvida central
  resposta     text not null,       -- o que a CF diz, em linguagem simples
  veredicto_positivo text,          -- o que é permitido
  veredicto_negativo text,          -- o que viola a CF
  gerado_por_ia boolean default false,
  ativo         boolean default true,
  criado_em     timestamptz default now()
);

create index idx_casos_artigo    on casos_dia_a_dia(artigo_id);
create index idx_casos_categoria on casos_dia_a_dia(categoria);

-- ============================================================
-- TABELA: profiles
-- Estende auth.users do Supabase
-- ============================================================

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text,
  plano       plano_enum not null default 'gratis',
  plano_ate   timestamptz,           -- null = sem assinatura ativa
  xp_total    int not null default 0,
  sequencia   int not null default 0,
  ultimo_acesso date,
  criado_em   timestamptz default now()
);

-- trigger: cria profile automaticamente ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id, nome)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TABELA: progresso_concurso
-- Progresso do usuário por concurso (cache agregado)
-- ============================================================

create table progresso_concurso (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  concurso_id    uuid not null references concursos(id) on delete cascade,
  total_respondidas int not null default 0,
  total_certas      int not null default 0,
  sequencia_atual   int not null default 0,
  sequencia_max     int not null default 0,
  ultima_atividade  timestamptz default now(),
  unique(user_id, concurso_id)
);

create index idx_prog_user on progresso_concurso(user_id);

-- ============================================================
-- TABELA: respostas
-- Histórico individual de cada resposta do usuário
-- ============================================================

create table respostas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  questao_id    uuid not null references questoes(id) on delete cascade,
  resposta_cespe  gabarito_enum,  -- o que o usuário respondeu (CESPE)
  resposta_letra  text,           -- o que o usuário respondeu (múltipla escolha)
  correta       boolean not null,
  tempo_ms      int,              -- tempo de resposta em milissegundos
  respondida_em timestamptz default now()
);

create index idx_respostas_user    on respostas(user_id);
create index idx_respostas_questao on respostas(questao_id);
create index idx_respostas_data    on respostas(respondida_em desc);

-- ============================================================
-- TABELA: artigos_salvos
-- Favoritos do usuário
-- ============================================================

create table artigos_salvos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  artigo_id  uuid not null references artigos(id) on delete cascade,
  salvo_em   timestamptz default now(),
  unique(user_id, artigo_id)
);

-- ============================================================
-- TABELA: simulados
-- Sessões de simulado (agrupam N questões)
-- ============================================================

create table simulados (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  concurso_id  uuid references concursos(id) on delete set null,
  assunto      text,
  total_q      int not null,
  certas       int not null default 0,
  erradas      int not null default 0,
  tempo_total_ms int,
  finalizado   boolean default false,
  iniciado_em  timestamptz default now(),
  finalizado_em timestamptz
);

create table simulado_questoes (
  simulado_id  uuid not null references simulados(id) on delete cascade,
  questao_id   uuid not null references questoes(id) on delete cascade,
  ordem        int not null,
  primary key (simulado_id, questao_id)
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- retorna se o usuário tem plano ativo (não-grátis e não expirado)
create or replace function public.tem_plano_pago()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and plano <> 'gratis'
      and (plano_ate is null or plano_ate > now())
  );
$$;

-- atualiza progresso_concurso após cada resposta
create or replace function public.atualizar_progresso()
returns trigger language plpgsql security definer as $$
declare
  v_concurso uuid;
begin
  select concurso_id into v_concurso from questoes where id = new.questao_id;
  if v_concurso is null then return new; end if;

  insert into public.progresso_concurso(user_id, concurso_id, total_respondidas, total_certas)
  values (new.user_id, v_concurso, 1, case when new.correta then 1 else 0 end)
  on conflict (user_id, concurso_id) do update set
    total_respondidas = progresso_concurso.total_respondidas + 1,
    total_certas      = progresso_concurso.total_certas + (case when new.correta then 1 else 0 end),
    ultima_atividade  = now();
  return new;
end;
$$;

create trigger after_resposta_insert
  after insert on respostas
  for each row execute procedure public.atualizar_progresso();

-- acumula XP no profile após resposta correta
create or replace function public.acumular_xp()
returns trigger language plpgsql security definer as $$
begin
  if new.correta then
    update public.profiles
    set xp_total = xp_total + 10,
        sequencia = sequencia + 1,
        ultimo_acesso = current_date
    where id = new.user_id;
  else
    update public.profiles
    set sequencia = 0,
        ultimo_acesso = current_date
    where id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger after_resposta_xp
  after insert on respostas
  for each row execute procedure public.acumular_xp();

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- acerto por assunto para um usuário
create or replace view v_acerto_por_assunto as
select
  r.user_id,
  q.assunto,
  count(*) as total,
  sum(case when r.correta then 1 else 0 end) as certas,
  round(100.0 * sum(case when r.correta then 1 else 0 end) / count(*), 1) as pct_acerto
from respostas r
join questoes q on q.id = r.questao_id
where q.assunto is not null
group by r.user_id, q.assunto;

-- ranking global (top 100)
create or replace view v_ranking as
select
  p.id,
  p.nome,
  p.xp_total,
  p.sequencia,
  rank() over (order by p.xp_total desc) as posicao
from profiles p
order by p.xp_total desc
limit 100;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles             enable row level security;
alter table progresso_concurso   enable row level security;
alter table respostas            enable row level security;
alter table artigos_salvos       enable row level security;
alter table simulados            enable row level security;
alter table simulado_questoes    enable row level security;

-- profiles: usuário lê/edita apenas o próprio
create policy "profile_select" on profiles for select using (id = auth.uid());
create policy "profile_update" on profiles for update using (id = auth.uid());

-- respostas: usuário lê/insere apenas as próprias
create policy "respostas_select" on respostas for select using (user_id = auth.uid());
create policy "respostas_insert" on respostas for insert with check (user_id = auth.uid());

-- progresso: usuário lê apenas o próprio
create policy "progresso_select" on progresso_concurso for select using (user_id = auth.uid());

-- artigos salvos: usuário gerencia apenas os próprios
create policy "salvos_select" on artigos_salvos for select using (user_id = auth.uid());
create policy "salvos_insert" on artigos_salvos for insert with check (user_id = auth.uid());
create policy "salvos_delete" on artigos_salvos for delete using (user_id = auth.uid());

-- simulados: usuário lê/cria apenas os próprios
create policy "simulados_select" on simulados for select using (user_id = auth.uid());
create policy "simulados_insert" on simulados for insert with check (user_id = auth.uid());
create policy "simulados_update" on simulados for update using (user_id = auth.uid());

-- simulado_questoes: acesso via simulado do próprio usuário
create policy "sim_q_select" on simulado_questoes for select
  using (exists (select 1 from simulados s where s.id = simulado_id and s.user_id = auth.uid()));

-- tabelas públicas (leitura para todos autenticados)
create policy "artigos_read"    on artigos          for select to authenticated using (true);
create policy "incisos_read"    on incisos           for select to authenticated using (true);
create policy "concursos_read"  on concursos         for select to authenticated using (ativo = true);
create policy "assuntos_read"   on concurso_assuntos for select to authenticated using (true);
create policy "questoes_read"   on questoes          for select to authenticated using (ativo = true);
create policy "casos_read"      on casos_dia_a_dia   for select to authenticated using (ativo = true);

-- questões restritas ao plano pago (além das 20 gratuitas/dia — lógica no app)
-- obs: controle de cota é feito na Edge Function, não por RLS, para flexibilidade

-- ============================================================
-- SEED: concursos iniciais
-- ============================================================

insert into concursos (slug, nome, orgao, banca, area, nivel_formacao, peso_const_pct) values
  ('prf-2024',        'PRF — Policial Rodoviário Federal',    'DPRF',    'CESPE', 'policial',   'Nível superior',   18),
  ('pf-delegado-2024','PF — Delegado de Polícia Federal',     'DPF',     'CESPE', 'policial',   'Nível superior',   22),
  ('pf-agente-2024',  'PF — Agente de Polícia Federal',       'DPF',     'CESPE', 'policial',   'Nível superior',   15),
  ('trf-juiz-2025',   'Juiz Federal — TRF (todas as regiões)','CNJ',     'CESPE', 'judiciario', 'Pós-graduação',    30),
  ('tcu-auditor-2024','TCU — Auditor Federal de Controle',    'TCU',     'CESPE', 'federal',    'Nível superior',   20),
  ('inss-2024',       'INSS — Técnico do Seguro Social',      'INSS',    'CESPE', 'federal',    'Nível médio',      12),
  ('trt-analista-2025','TRT — Analista Judiciário',           'CNJ',     'FCC',   'judiciario', 'Nível superior',   25);

-- ============================================================
-- SEED: distribuição de assuntos — PRF
-- ============================================================

with prf as (select id from concursos where slug = 'prf-2024')
insert into concurso_assuntos (concurso_id, assunto, peso_pct, ordem)
select prf.id, assunto, peso, ord from prf, (values
  ('Direitos e garantias fundamentais', 35.00, 1),
  ('Organização do Estado',             25.00, 2),
  ('Poder Executivo e Legislativo',     20.00, 3),
  ('Ordem econômica e financeira',      12.00, 4),
  ('Demais temas constitucionais',       8.00, 5)
) as t(assunto, peso, ord);
