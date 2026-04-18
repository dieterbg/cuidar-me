# Sistema de Logs, Auditoria e Compliance LGPD

> **Última atualização:** 2026-04-18
> **Status:** Fases 1, 2 e 3 em produção. Fases 4 e 5 pendentes.
> **Commits relevantes:** `2540634` (Fases 1+2), `b81611f` (Fase 3)

Este documento descreve o sistema completo de logging, auditoria e conformidade
LGPD do Cuidar.me — por que foi construído, como funciona, o que cobre e o que
ainda falta implementar.

---

## 1. Contexto e motivação

O Cuidar.me trata **dados sensíveis de saúde** (Art. 5º, II, LGPD), o que exige:

- **Trilha de auditoria** — saber quem acessou o quê, quando, por quê
  (LGPD Art. 37, exigência CFM para prontuário eletrônico: **retenção 5 anos**).
- **Eventos de segurança** — registrar tentativas de acesso indevido,
  rate limits, tokens inválidos (LGPD Art. 46 — medidas de segurança).
- **Direito de acesso do titular** — responder em até 15 dias quem acessou
  seus dados e para qual finalidade (LGPD Art. 18, II e Art. 19).
- **Observabilidade operacional** — debugar erros 63049 do Meta, falhas de
  entrega Twilio, bugs de gamificação, sem vazar PII nos logs de stdout.
- **Pseudonimização** — métricas de negócio (funil, conversão) sem
  identificação direta do paciente (LGPD Art. 12).

Antes deste sistema: havia apenas `console.log` espalhado, sem retenção,
sem PII redaction, sem trilha persistente de "quem fez o quê".

---

## 2. Arquitetura

### 2.1 Quatro canais de log

| Canal | Destino | Retenção | Conteúdo | LGPD |
|---|---|---|---|---|
| `logger.info/warn/error/debug` | stdout (Vercel) | Efêmero | Debug operacional, **PII redigida** | Art. 46 |
| `logger.audit()` | `audit_logs` (Postgres) | **5 anos** | Quem fez o quê, PII preservada | Art. 19, 37, CFM |
| `logger.security()` | `security_events` (Postgres) | **1 ano** | Eventos de segurança | Art. 46 |
| `logger.business()` | `business_events` (Postgres) | **2 anos** | Métricas pseudonimizadas | Art. 12 |
| Twilio webhooks | `twilio_webhooks` (Postgres) | **90 dias** | Status callbacks de entrega | Operacional |

### 2.2 Fluxo

```
       aplicação (server action, API, handler)
                    │
                    ▼
            ┌───────────────┐
            │  lib/logger   │  ← PII redaction para stdout
            └───┬───────┬───┘
                │       │
       stdout ──┘       └── service_role client (dynamic require)
                              │
                              ▼
              ┌──────────────────────────────┐
              │  Postgres (Supabase)         │
              │  • audit_logs                │
              │  • security_events           │
              │  • business_events           │
              │  • twilio_webhooks           │
              │  com RLS (admin/staff/owner) │
              └──────────────────────────────┘
                              │
                              ▼
              ┌──────────────────────────────┐
              │  UI admin (/admin/logs)      │
              │  Relatório LGPD por paciente │
              │  (/patient/[id]/access-log)  │
              └──────────────────────────────┘
```

### 2.3 Decisão arquitetural importante

`lib/logger.ts` **não faz `import` estático** de `@/lib/supabase-server-utils`,
porque esse módulo importa `next/headers` (server-only), o que quebra o bundle
do cliente quando qualquer arquivo compartilhado (ex: `use-auth.tsx`)
transitivamente referencia o logger.

Em vez disso, o logger usa `require('@supabase/supabase-js')` dinâmico dentro
da função `getAdminClient()`, com guard `typeof window !== 'undefined'`. No
client, writes viram no-op.

---

## 3. Fase 1 — Fundação

### 3.1 Migration `20260417_create_logging_tables.sql`

Cria as 4 tabelas com:

- **Índices** em `created_at`, `patient_id`, `actor_id`, `action`, `severity`,
  `event_type`, `status`, `error_code`.
- **RLS habilitada**:
  - `audit_logs`: leitura apenas por admin; paciente pode ler **seus próprios
    registros** (LGPD Art. 19); INSERT/UPDATE bloqueados ao usuário comum
    (só `service_role` escreve, append-only).
  - `security_events`: leitura apenas por admin.
  - `business_events`: leitura por admin e equipe de saúde.
  - `twilio_webhooks`: leitura por admin e equipe de saúde.
- **Comentários SQL** documentando cada tabela e coluna.

### 3.2 `src/lib/logger.ts`

**Redação de PII automática em stdout** (não afeta tabelas):

- Padrões chave sensíveis: `password`, `token`, `secret`, `authorization`,
  `cookie`, `apikey` → `[REDACTED]`.
- Padrões PII: `email`, `phone`, `whatsapp`, `cpf`, `full_name`,
  `message_content`, `text`, `last_message`.
- Mascaramento:
  - Telefone `+5551999998888` → `+**********8888`
  - Email `joao.silva@example.com` → `j***@example.com`
  - Nome `João Silva Santos` → `João S. S.`
  - CPF → `***.***.***-**`
  - Mensagem → `[REDACTED:42chars]`

**API pública:**

```ts
import { loggers, createLogger } from '@/lib/logger';

// Pré-configurados: cron, ai, gamification, protocol, whatsapp, auth,
// admin, onboarding, api
loggers.ai.info('mensagem recebida', { patientId, phone });  // phone redigido
loggers.ai.error('falha', error, { patientId });

await loggers.ai.audit({
  actorId: user.id,
  actorRole: 'equipe_saude',
  action: 'view_patient',
  resourceType: 'patient',
  resourceId: patient.id,
  patientId: patient.id,
  ip: req.headers.get('x-forwarded-for'),
  metadata: { source: 'web_ui' },
});

await loggers.ai.security({
  eventType: 'rate_limit_hit',
  severity: 'warning',
  ip,
  description: 'IP bloqueado após 100 req/min',
});

await loggers.ai.business({
  eventType: 'onboarding_completed',
  patientId,
  metadata: { tier: 'free' },
});
```

**Garantias:**
- `safeInsert()` nunca lança — falha de log nunca quebra fluxo de negócio.
- Em ambiente sem `SUPABASE_SERVICE_ROLE_KEY`, escrita em tabela é no-op.

---

## 4. Fase 2 — Instrumentação dos pontos críticos

### 4.1 Twilio Status Callbacks — `src/app/api/whatsapp/status/route.ts`

**Novo endpoint** que recebe callbacks do Twilio a cada mudança de status de
mensagem (`queued → sent → delivered → read` ou `→ failed/undelivered`).

- Valida `X-Twilio-Signature` (HMAC com `TWILIO_AUTH_TOKEN`).
- Insere em `twilio_webhooks`.
- Best-effort lookup de `patient_id` via `to_number`.
- **Alertas automáticos:**
  - Erro `63049` (bloqueio Meta em MARKETING) → `security_events` severity
    `critical`.
  - Erro `63016` (fora da janela 24h, template não disponível) →
    `security_events` severity `warning`.

### 4.2 `src/lib/twilio.ts`

Adicionado `statusCallback` em `messages.create()`:

```ts
const publicBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
const statusCallback = publicBaseUrl
  ? (publicBaseUrl.startsWith('http') ? publicBaseUrl : `https://${publicBaseUrl}`)
    + '/api/whatsapp/status'
  : undefined;
```

### 4.3 Auditoria em `src/ai/actions/messages.ts`

Helper `getActor()` resolve o usuário logado + IP para cada ação.

`log.audit()` chamado em:
- `addMessageAndSendWhatsapp` → `action: 'send_whatsapp'`
- `rescheduleMessage` → `action: 'reschedule_message'`
- `resolvePatientAttention` → `action: 'resolve_attention'`
- `deleteMessages` → `action: 'delete_message'` (bulk, um registro por mensagem)

### 4.4 Opt-out em `src/ai/handlers/opt-out-handler.ts`

`log.business({ eventType: 'opt_out' })` + `log.audit({ action: 'opt_out',
actorRole: 'patient' })` quando paciente envia "SAIR" no WhatsApp.

---

## 5. Fase 3 — UI de visualização

### 5.1 `src/ai/actions/logs.ts` — Server Actions

Todas protegidas por `requireAdmin()`, que lança `Error('Acesso negado')` se
o caller não tem `profile.role === 'admin'`.

| Função | Retorna | Filtros |
|---|---|---|
| `getAuditLogs(filters)` | `AuditLogRow[]` | action, patientId, actorId, from/toDate |
| `getSecurityEvents(filters)` | `SecurityEventRow[]` | severity, eventType, dates |
| `getBusinessEvents(filters)` | `BusinessEventRow[]` | eventType, patientId, dates |
| `getTwilioWebhooks(filters)` | `TwilioWebhookRow[]` | status, errorCode, patientId, dates |
| `getLogsStats()` | counts p/ tiles | — |
| `getPatientAccessLog(patientId)` | `AuditLogRow[]` (500) | — |

Todas usam `createServiceRoleClient()` pois já fazem permission check manual.

### 5.2 `/admin/logs` — dashboard

**Localização:** `src/app/(dashboard)/admin/logs/page.tsx`
**Acesso:** sidebar → Admin → "Logs & Auditoria" (ícone `FileSearch`)

**Componentes:**
- **4 Stats tiles** (topo): auditoria 24h, segurança críticas 7d, webhooks
  falhos 24h, erro 63049 na semana. Tiles com valor > 0 ficam destacados em
  vermelho.
- **4 abas:**
  - **Auditoria** — filtro livre (ação/paciente/recurso). Nome do paciente é
    link para `/patient/[id]/access-log`.
  - **Segurança** — severity colorida (info/warning/critical), IP, descrição.
  - **Negócio** — pseudonimizado (só mostra primeiros 8 chars de patient_id).
  - **Twilio** — filtro por status. Erro 63049 em vermelho negrito. Linhas
    `failed`/`undelivered` com fundo vermelho suave.
- **Botão "Atualizar"** no topo, usando `useTransition` para não bloquear UI.

### 5.3 `/patient/[id]/access-log` — relatório LGPD Art. 19

**Localização:** `src/app/(dashboard)/patient/[id]/access-log/page.tsx`
**Acesso:** link da aba Auditoria ou URL direta (só admin).

**Inclui:**
- Nome do paciente + últimos 500 acessos.
- Alert explícito citando LGPD Art. 18, II e Art. 19.
- **Botão "Exportar CSV"** com BOM UTF-8 (abre limpo no Excel). Nome de
  arquivo: `access-log-{patientId}-{YYYY-MM-DD}.csv`.
- Colunas: data/hora, ação, papel, recurso, IP.

### 5.4 Correção de `.gitignore`

A regra genérica `logs/` estava engolindo `src/app/(dashboard)/admin/logs/`.
Adicionada exceção `!src/app/**/logs/` + `!src/app/**/logs/**`.

---

## 6. Estado atual (2026-04-18)

### ✅ Em produção
- Migrations das 4 tabelas + RLS (commit `2540634`).
- `lib/logger.ts` com PII redaction e 4 canais (commit `2540634`).
- Twilio status webhook + auditoria das ações de mensagens (commit `2540634`).
- UI `/admin/logs` + `/patient/[id]/access-log` (commit `b81611f`).

### ⚠️ Configuração manual exigida (já feita)
- O usuário precisa ter rodado a migration SQL no Supabase SQL Editor.
- A Vercel precisa ter `NEXT_PUBLIC_SITE_URL` ou `VERCEL_URL` configuradas
  para o `statusCallback` do Twilio funcionar.
- O Twilio **não precisa** de configuração adicional — o `statusCallback` é
  passado por requisição. Porém, se quiser usar o webhook como default da
  conta, configurar em Twilio Console → Messaging → Settings.

### ⏳ Pendente

#### Fase 4 — Retenção e alertas
- **Cron de retenção** (`/api/cron/retention`, diário):
  - `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '5 years'`
  - `DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '1 year'`
  - `DELETE FROM business_events WHERE created_at < NOW() - INTERVAL '2 years'`
  - `DELETE FROM twilio_webhooks WHERE created_at < NOW() - INTERVAL '90 days'`
- **Alertas por e-mail** (Resend ou SendGrid):
  - Quando `security_events.severity = 'critical'` é inserido → e-mail ao admin.
  - Quando erro 63049 ocorre → e-mail com instruções para trocar template.
  - Rate limit interno para não enviar 100 e-mails/hora do mesmo tipo.
- **Dashboard de métricas** (opcional): gráfico histórico de entregas Twilio,
  taxa de falha por dia, top 10 ações auditadas.

#### Fase 5 — LGPD polish
- **Export-my-data** (LGPD Art. 18, V — portabilidade):
  - Endpoint `/api/patient/me/export` retornando ZIP com JSONs de todos
    os dados do paciente logado (profile, metrics, messages, protocols,
    access-log).
  - Botão no portal do paciente em `/portal/profile`.
- **Aviso de privacidade** (LGPD Art. 9º):
  - Página `/privacidade` (já existe mas precisa revisão) com:
    - Quais dados são coletados e por quê.
    - Com quem são compartilhados (Twilio, Supabase, Meta).
    - Retenção.
    - Como exercer direitos (acesso, correção, exclusão, portabilidade).
    - Contato do DPO/encarregado.
  - Checkbox obrigatório no onboarding aceitando os termos.
- **Consentimento WhatsApp explícito** no primeiro contato, antes do
  primeiro envio proativo, com resposta gravada em `audit_logs`.

#### Outros itens considerados mas não priorizados
- **Integração com Sentry** para erros de stdout — já há `SENTRY-SETUP.md`,
  mas ainda não está instalado.
- **Log aggregation externo** (Datadog, BetterStack) — custo não justifica
  no estágio atual; Vercel logs + tabelas Postgres bastam.
- **Row-level audit triggers no Postgres** (Supabase audit extension) —
  duplica o que o logger já faz e é mais difícil de filtrar por contexto.

---

## 7. Como usar durante desenvolvimento

### 7.1 Verificar logs no Supabase
```sql
-- Últimas 50 ações auditadas
SELECT created_at, action, resource_type, actor_role, patient_id
FROM audit_logs
ORDER BY created_at DESC
LIMIT 50;

-- Eventos críticos da semana
SELECT * FROM security_events
WHERE severity = 'critical' AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Bloqueios Meta (erro 63049) nas últimas 24h
SELECT * FROM twilio_webhooks
WHERE error_code = 63049 AND created_at > NOW() - INTERVAL '24 hours';
```

### 7.2 Adicionar auditoria a uma nova server action
```ts
import { loggers } from '@/lib/logger';
import { createClient } from '@/lib/supabase-server';

const log = loggers.admin;

export async function minhaAcao(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ... lógica da ação ...

  await log.audit({
    actorId: user?.id,
    actorRole: 'admin',
    action: 'minha_acao',
    resourceType: 'recurso',
    resourceId: id,
    metadata: { /* contexto adicional */ },
  });
}
```

### 7.3 Adicionar um novo stats tile
Editar `src/ai/actions/logs.ts` → `getLogsStats()` adicionando mais uma
Promise. Editar `src/app/(dashboard)/admin/logs/page.tsx` → grid de tiles.

---

## 8. Referências

- **LGPD** — Lei 13.709/2018 (Arts. 7º, 9º, 12, 18, 19, 37, 46).
- **CFM** — Resolução 1.821/2007 (prontuário eletrônico, retenção 20 anos
  após último atendimento; adotamos 5 anos rolantes como trilha de auditoria
  da plataforma, separada do prontuário clínico).
- **Twilio error codes** — `63049` (Meta block), `63016` (outside 24h window).
- **Supabase RLS** — docs.supabase.com/guides/auth/row-level-security.
