# Edge Functions — ConstituiçãoFácil

## Funções incluídas

| Função          | Rota                              | Descrição                              |
|-----------------|-----------------------------------|----------------------------------------|
| `gerar-questoes`| `/functions/v1/gerar-questoes`    | Gera N questões estilo CESPE via IA    |
| `gerar-caso`    | `/functions/v1/gerar-caso`        | Gera 1 caso do dia a dia via IA        |

---

## Pré-requisitos

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Vincular ao projeto (use o project ref do painel Supabase)
supabase link --project-ref SEU_PROJECT_REF
```

---

## Variáveis de ambiente (Secrets)

Configure no painel Supabase → Settings → Edge Functions → Secrets,
ou via CLI:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> SUPABASE_URL e SUPABASE_ANON_KEY são injetadas automaticamente.

---

## Deploy

```bash
# Gerar questões
supabase functions deploy gerar-questoes --no-verify-jwt

# Gerar caso
supabase functions deploy gerar-caso --no-verify-jwt
```

> `--no-verify-jwt` desativa a verificação automática de JWT pelo Supabase Gateway
> — a verificação manual já está implementada dentro de cada função.

---

## Chamada pelo frontend (supabase-js)

```typescript
import { supabase } from "@/lib/supabaseClient";

// Gerar 5 questões estilo CESPE para o Art. 5º
const { data, error } = await supabase.functions.invoke("gerar-questoes", {
  body: {
    artigo_id: "UUID_DO_ARTIGO_5",
    concurso_id: "UUID_DO_CONCURSO_PRF",  // opcional
    quantidade: 5,
    nivel: "medio",
  },
});

// Gerar um caso do dia a dia para o Art. 5º, inciso XII
const { data, error } = await supabase.functions.invoke("gerar-caso", {
  body: {
    artigo_id: "UUID_DO_ARTIGO_5",
    inciso_id: "UUID_DO_INCISO_XII",       // opcional
    categoria: "policia",                  // opcional
  },
});
```

---

## Controle de acesso

| Situação                          | Resultado         |
|-----------------------------------|-------------------|
| Sem token JWT                     | 401               |
| Plano gratuito (`gerar-questoes`) | 403               |
| Plano pago expirado               | 403               |
| Artigo inexistente                | 404               |
| Claude API indisponível           | 502               |
| JSON inválido da IA               | 500 (retry)       |

---

## Estimativa de custos (Claude API)

| Operação        | Input tokens | Output tokens | Custo aprox.   |
|-----------------|-------------|---------------|----------------|
| 5 questões CESPE | ~800        | ~1.200        | ~R$ 0,04       |
| 10 questões CESPE| ~800        | ~2.400        | ~R$ 0,07       |
| 1 caso dia a dia | ~600        | ~500          | ~R$ 0,01       |

Preços baseados em `claude-sonnet-4-6`: $3/M input · $15/M output (abr/2026).

**Estratégia de custo recomendada:** gerar questões em batch por artigo e cachear
no banco — o usuário consome questões já salvas, a IA só é chamada quando
o artigo ainda não tem questões suficientes ou quando o usuário esgotou o banco.
