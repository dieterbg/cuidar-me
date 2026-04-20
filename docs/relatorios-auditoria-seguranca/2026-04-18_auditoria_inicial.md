# Relatório de Auditoria de Segurança — Cuidar.me

**Data:** 2026-04-18
**Escopo:** Full-repo (baseline inicial — branch `main`, commit `3135b83`)
**Auditor:** Claude (skill `security-audit`, Opus 4.7)
**Metodologia:** 12 checks sistemáticos conforme `~/.claude/skills/security-audit/SKILL.md`

---

## Executive summary

| Severidade | Quantidade |
|---|---|
| 🔴 **CRITICAL** | **5** |
| 🟠 HIGH | 4 |
| 🟡 MEDIUM | 5 |
| 🟢 LOW | 3 |

**Readiness para produção sensível: 🔴 RED.**

Foram encontradas **5 falhas críticas** com impacto de:
- Vazamento completo de credenciais server-side (Twilio, Firebase, CRON)
- Promoção arbitrária de qualquer conta a plano VIP/Premium gratuito
- Geração ilimitada de tokens de convite pré-aprovado sem autenticação
- Leitura irrestrita de dados médicos sensíveis (exames laboratoriais) cross-tenant
- Enumeração de todos os tokens válidos por usuário anônimo

**Ação imediata recomendada:** bloquear deploys até corrigir CRITICAL #1–#5. Essas falhas podem ser exploradas em minutos por um atacante ocasional que leia o código open-source / decodifique o bundle JS.

---

## 🔴 CRITICAL

### CRITICAL-1 — Secrets server-side vazados no bundle do cliente
**Localização:** `next.config.js:8–17`
**Impacto:** Qualquer visitante do site abre DevTools → Sources e extrai `TWILIO_AUTH_TOKEN`, `FIREBASE_PRIVATE_KEY`, `CRON_SECRET`, `TWILIO_ACCOUNT_SID`. Com Twilio auth token, atacante envia SMS/WhatsApp em nome da empresa (custo operacional + impersonação de saúde). Com Firebase private key, atacante autentica como service account no GCP. Com `CRON_SECRET`, dispara todos os crons arbitrariamente (spam a pacientes).
**Evidência:**
```js
env: {
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET || 'CuidarMeCronSecret123',
    ...
}
```
O bloco `env` do Next.js injeta valores **no bundle do cliente em build-time** — é diferente de `process.env` usado server-side.

Pior: `CRON_SECRET` tem fallback hardcoded `'CuidarMeCronSecret123'` — se a env var não estiver setada, esse valor literal vai para o bundle e está visível no repositório público.

**Remediação:**
1. Remover o bloco `env: { ... }` inteiro do `next.config.js`. Usar `process.env.X` diretamente nos arquivos server-side (API routes, server actions, cron handlers). Next.js já disponibiliza env vars server-side sem registrar em `env`.
2. Remover fallback hardcoded `'CuidarMeCronSecret123'` — falhar explicitamente se `CRON_SECRET` ausente.
3. **Rotacionar imediatamente**: `TWILIO_AUTH_TOKEN`, `FIREBASE_PRIVATE_KEY`, `CRON_SECRET` — assumir comprometidos (todo deploy anterior publicou no bundle).
4. Revogar token Twilio antigo no console Twilio.
5. Gerar nova service account Firebase, revogar a antiga.
**Esforço:** M (rotação de secrets + redeploy).

---

### CRITICAL-2 — `invite_tokens` enumeráveis por usuário anônimo
**Localização:** `supabase/migrations/20260407_create_invite_tokens.sql:42–46`
**Impacto:** Atacante com Supabase anon key (público) faz `SELECT * FROM invite_tokens WHERE used_at IS NULL AND expires_at > NOW()` e recebe **a lista completa de tokens pré-aprovados válidos**. Usa qualquer um pra criar conta bypassando aprovação manual e recebe o plano configurado no token (freemium / premium / vip).
**Evidência:**
```sql
CREATE POLICY "anyone_can_verify_valid_token" ON invite_tokens
    FOR SELECT TO anon
    USING (expires_at > NOW() AND used_at IS NULL);
```
O comentário diz *"by exact token match"* mas a cláusula `USING` **não força match por token**. Qualquer SELECT sem filtro retorna todos os tokens válidos.
**Remediação:**
1. Remover a policy `anyone_can_verify_valid_token`.
2. O endpoint `consume-invite` já usa service_role — não precisa de policy anon.
3. Se quiser verificação client-side de validade do token (UX), criar RPC `validate_invite_token(token UUID)` com `SECURITY DEFINER` que retorna booleano, não o registro.
**Esforço:** S.

---

### CRITICAL-3 — `generate-invite` sem verificação de role
**Localização:** `src/app/api/onboarding/generate-invite/route.ts:5–51`
**Impacto:** Qualquer usuário (inclusive não-autenticado — o check de JWT é opcional) chama este endpoint e cria invite tokens. Não valida se o chamador é admin/staff.
**Evidência:**
```ts
export async function POST(req: Request) {
    const supabase = createServiceRoleClient();
    const { plan } = await req.json();
    // JWT check só SETA o created_by — não bloqueia sem JWT
    const accessToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    let createdBy: string | null = null;
    if (accessToken) { /* ... verifica só pra preencher createdBy */ }

    // INSERT acontece SEMPRE, com ou sem auth
    const { data, error } = await supabase
        .from('invite_tokens')
        .insert({ plan: plan || 'freemium', created_by: createdBy })
        .select('token').single();
```
Atacante roda em loop: gera 10.000 tokens VIP pré-aprovados, distribui / vende.
**Remediação:**
```ts
// No topo da função:
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
if (!['admin', 'equipe_saude', 'assistente'].includes(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
// Só então o INSERT.
```
**Esforço:** S.

---

### CRITICAL-4 — `consume-invite` com IDOR em `userId`
**Localização:** `src/app/api/onboarding/consume-invite/route.ts:4–78`
**Impacto:** O endpoint recebe `userId` do body do request e não valida se é o mesmo usuário autenticado. Combinado com CRITICAL-2 (lista tokens) e CRITICAL-3 (gera tokens), atacante:
1. Gera token VIP (CRITICAL-3).
2. Pega o user_id de qualquer paciente (via IDOR em outra rota ou guess UUID).
3. Chama `consume-invite` com `{ token, userId: <alvo> }`.
4. Atualiza `profiles.invite_plan = 'vip'`, `invite_pre_approved = true` **para a vítima**, e promove `patients.plan = 'vip'` e `status = 'active'`.
**Evidência:**
```ts
const { token, userId } = await req.json();
// Nenhuma verificação de auth.getUser().id === userId
await supabase.from('profiles').update({ invite_pre_approved: true, invite_plan: invite.plan }).eq('id', userId);
await supabase.from('patients').update({ status: 'active', plan: invite.plan }).eq('user_id', userId);
```
**Remediação:**
```ts
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const { token } = await req.json();        // NÃO aceitar userId do body
const userId = user.id;                      // derivar sempre da sessão
```
**Esforço:** S.

---

### CRITICAL-5 — `lab_results` sem RLS (dados médicos sensíveis abertos)
**Localização:** `supabase/migrations/20251126_lab_results.sql`
**Impacto:** Tabela com **dados laboratoriais de saúde** — glicemia, HbA1c, colesterol, função renal/hepática, tireoide, vitaminas — **sem RLS habilitada**. Qualquer usuário com a anon key (público) faz `SELECT * FROM lab_results` e obtém todos os exames de todos os pacientes. Violação direta de LGPD Art. 11 (dados sensíveis de saúde exigem base legal reforçada).
**Evidência:**
```bash
$ grep -n "RLS\|ROW LEVEL\|POLICY" supabase/migrations/20251126_lab_results.sql
# (zero resultados)
```
**Remediação:** nova migration:
```sql
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_lab_results" ON lab_results
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'equipe_saude', 'assistente')
  ));

CREATE POLICY "patient_read_own_labs" ON lab_results
  FOR SELECT TO authenticated
  USING (patient_id IN (
    SELECT id FROM patients WHERE user_id = auth.uid()
  ));

CREATE POLICY "staff_write_lab_results" ON lab_results
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'equipe_saude')
  ));
```
**Esforço:** S.

---

## 🟠 HIGH

### HIGH-1 — Cron endpoint fail-open quando `CRON_SECRET` ausente
**Localização:** `src/app/api/cron/unified/route.ts:42–49`
**Impacto:** Se `CRON_SECRET` não estiver setada, o endpoint fica público. `const isAuthorized = !cronSecret || ...` — falha em vez de negar. Combinado com CRITICAL-1 que vaza o secret atual, cria ainda mais superfície.
**Remediação:**
```ts
if (!cronSecret) {
    console.error('[UNIFIED CRON] CRON_SECRET not configured — refusing request');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
}
const isAuthorized = authHeader === `Bearer ${cronSecret}` || tokenParam === cronSecret;
if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```
**Esforço:** S.

### HIGH-2 — `notify-plan-upgrade` autenticado mas sem role check
**Localização:** `src/app/api/onboarding/notify-plan-upgrade/route.ts:15–21`
**Impacto:** Qualquer usuário autenticado (inclusive paciente) pode disparar envio de WhatsApp para qualquer outro paciente com mensagem de upgrade falso. Vetor de spam + phishing dentro da plataforma.
**Remediação:** adicionar role check igual ao CRITICAL-3.
**Esforço:** S.

### HIGH-3 — Dependências com vulnerabilidades críticas/altas
**Localização:** `package.json` (deps transitivas)
**Impacto:** `npm audit --production` retorna 30 vulnerabilidades: **2 critical** (`handlebars`, `protobufjs`), **8 high** (`axios`, `next`, `lodash`, `jws`, `node-forge`, `path-to-regexp`, `picomatch`, `fast-xml-parser`).
**Remediação:**
```bash
npm audit fix
# Para as que exigem breaking change:
npm audit fix --force    # revisar diffs antes
# Em particular, atualizar Next.js para última minor da 14.x ou 15.x
```
**Esforço:** M (algumas exigem teste de regressão).

### HIGH-4 — PII logada em plaintext em rotas de runtime
**Localização:**
- `src/cron/send-protocol-messages.ts:510` — `full_name` e dia
- `src/app/api/process-queue/route.ts:54` — `whatsapp_number`
- `src/app/portal/layout.tsx:208` — `user.email`
- `src/ai/handlers/checkin-response-handler.ts:27` — `whatsappNumber`
- `src/ai/actions/patients.ts:298` — `existingPatient.id`
**Impacto:** Logs Vercel retêm 24h–30d (dependendo do plano) esses dados PII em plaintext. Qualquer engenheiro com acesso a logs vê CPFs/telefones/e-mails. Violação LGPD Art. 46 (medidas técnicas).
**Remediação:** trocar `console.log` por `loggers.xxx.info()` — que aplica redaction automática. Exemplo:
```ts
// ❌ antes
console.log(`[TEST] 👤 ${patient.full_name} - Dia ${currentDay}`);
// ✅ depois
loggers.protocol.info('processando paciente', { patientId: patient.id, day: currentDay });
```
**Esforço:** M (5 pontos + grep ampla para capturar similares).

---

## 🟡 MEDIUM

### MEDIUM-1 — Nenhum security header configurado
**Localização:** `next.config.js`, `middleware.ts`
**Impacto:** Nenhum HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. Abre clickjacking, MIME-sniffing, mixed-content downgrades.
**Remediação:** adicionar em `next.config.js`:
```js
async headers() {
    return [{
        source: '/:path*',
        headers: [
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
    }];
}
```
CSP exige trabalho maior — fazer iterativamente em modo `Report-Only` antes.
**Esforço:** S (headers básicos); M (CSP completa).

### MEDIUM-2 — Rate limiting in-memory ineficaz em serverless
**Localização:** `src/lib/rate-limit.ts:17`
**Impacto:** `const requestStore = new Map<string, RequestLog>();` — cada instância Vercel tem seu próprio Map. Com 5 instâncias, atacante faz 5× o limite "configurado". Também reseta a cada deploy.
**Remediação:** migrar para Upstash Redis (free tier) ou Vercel KV. Alternativa: bloqueio direto via Cloudflare/Vercel Firewall para endpoints públicos críticos (`/api/whatsapp`, `/api/onboarding/*`).
**Esforço:** M.

### MEDIUM-3 — `dangerouslyAllowSVG: true` em Next.js images
**Localização:** `next.config.js:22`
**Impacto:** SVGs podem conter `<script>`. Se um atacante controlar URL de imagem renderizada via `next/image`, pode executar JS no contexto do Cuidar.me. As fontes atuais (`dicebear`, `unsplash`, `placehold.co`, `img.youtube.com`) são whitelist de confiança, mas a flag é global — qualquer SVG que passar por `next/image` é renderizado inline.
**Remediação:** remover a flag ou substituir por `contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"`.
**Esforço:** S.

### MEDIUM-4 — Debug endpoint `/api/debug/ping` vaza env var
**Localização:** `src/app/api/debug/ping/route.ts:4–9`
**Impacto:** Retorna `NEXT_PUBLIC_APP_URL` publicamente. Não é secret (é NEXT_PUBLIC), mas expõe arquitetura (domínio interno, ambiente). Fingerprinting.
**Remediação:** remover o campo ou proteger com `CRON_SECRET`.
**Esforço:** S.

### MEDIUM-5 — `initiate` onboarding aceita `patientId` arbitrário
**Localização:** `src/app/api/onboarding/initiate/route.ts:27`
**Impacto:** Usuário autenticado (qualquer role, inclusive `pendente`) pode passar `patientId` de outro paciente e disparar onboarding WhatsApp. Spam + possível loop de mensagens.
**Remediação:** verificar se `profile.role` é staff OU `patient.user_id === user.id`.
**Esforço:** S.

---

## 🟢 LOW

### LOW-1 — `NODE_ENV === 'development'` bypassa Twilio signature
**Localização:** `src/lib/twilio.ts:108–110`
**Impacto:** Se alguém setar `NODE_ENV=development` na Vercel (acidente), webhook aceita requisições não-assinadas. Unlikely mas defensivo.
**Remediação:** trocar por variável explícita `SKIP_TWILIO_VALIDATION=1` + comentário claro.
**Esforço:** S.

### LOW-2 — Alertas críticos ainda não enviam e-mail
**Localização:** `src/lib/logger.ts:249` + sistema de alertas (Fase 4 pendente)
**Impacto:** `security_events severity=critical` é gravado na tabela mas ninguém recebe notificação. Já documentado como Fase 4.
**Remediação:** Fase 4 do roadmap de logs (cron de retenção + alertas Resend/SendGrid).
**Esforço:** M.

### LOW-3 — Nenhuma verificação de backup / disaster recovery
**Localização:** Supabase project settings (não no código)
**Impacto:** Não há evidência no repo de que PITR está habilitado nem de runbook de restore testado. Ransomware ou `DELETE FROM patients` acidental = perda total.
**Remediação:**
1. Habilitar PITR no Supabase (Pro plan, custo ~$25/mês).
2. Documentar runbook em `docs/DISASTER_RECOVERY.md`.
3. Executar 1 teste real de restore em staging por trimestre.
**Esforço:** M (infra + doc + teste).

---

## ✅ Verificados OK (prova de negativa)

- ✅ Nenhum `.env*.local` em git (`git ls-files | grep .env` → só `.env.example`)
- ✅ Nenhum JWT hardcoded em `src/` (grep por `eyJ[A-Za-z0-9_-]{20,}` vazio)
- ✅ Logger `src/lib/logger.ts` sem imports top-level server-only (bundle client-safe)
- ✅ `patients` table tem RLS com política cross-tenant (`user_id = auth.uid()`)
- ✅ `audit_logs`, `security_events`, `business_events`, `twilio_webhooks` têm RLS
- ✅ Webhook `/api/whatsapp` valida `x-twilio-signature`
- ✅ Webhook `/api/whatsapp/status` valida `x-twilio-signature`
- ✅ `scheduled_messages` tem RLS (staff-only SELECT)
- ✅ Nenhum uso de `innerHTML` user-controlled (apenas `JSON.stringify(jsonLd)` SEO e chart CSS)
- ✅ Nenhum SSRF óbvio (grep por `fetch(${...})` vazio)
- ✅ PII redaction testada — 11/11 checks passaram (telefone, email, CPF, nome, tokens)

---

## Blockers para próximo deploy

Em ordem de prioridade para remediar **antes** de qualquer novo deploy em produção:

1. **CRITICAL-1** — Remover bloco `env: {}` do `next.config.js` e rotacionar todos os secrets.
2. **CRITICAL-5** — Habilitar RLS em `lab_results` (migration).
3. **CRITICAL-2** — Remover policy `anyone_can_verify_valid_token`.
4. **CRITICAL-3** — Proteger `generate-invite` com role check.
5. **CRITICAL-4** — `consume-invite` deve derivar `userId` da sessão, não do body.
6. **HIGH-1** — Cron fail-closed quando secret ausente.
7. **HIGH-2** — `notify-plan-upgrade` role check.

As demais (HIGH-3, HIGH-4, MEDIUMs, LOWs) podem ser endereçadas em sprints subsequentes mas **devem entrar no backlog imediatamente**.

---

## Recomendações além do sprint atual

1. **Habilitar PITR Supabase** (plano Pro) — não há DR hoje.
2. **Integrar Sentry** com PII scrubbing — documentação `docs/SENTRY-SETUP.md` existe mas não está instalado.
3. **Migrar rate-limit para Upstash Redis** — essencial para endpoints públicos como `/api/whatsapp`.
4. **Implementar Fase 4 de logs** (alertas por e-mail em `security_events severity=critical`) — já documentado no roadmap.
5. **Adicionar testes de autorização** — cada API route deve ter um teste "401 se não autenticado" e "403 se role errado".
6. **Security headers em middleware** — incluindo CSP em modo `Report-Only` inicial.
7. **CI com `npm audit`** — falhar build se `critical` ou `high` novos forem introduzidos.
8. **Rotação programada de secrets** — 90 dias para Twilio/Firebase/Supabase.
9. **Revisão de RLS via consulta SQL periódica** — script que lista tabelas sem RLS ou sem policy INSERT/UPDATE/DELETE.
10. **Threat modeling de prompt injection no Gemini** — mensagens do paciente viram parte do prompt; documentar defesas e validar com payloads adversariais.

---

## Próxima auditoria

Agendar **reaudit** após remediação dos CRITICAL + HIGH — idealmente em 7 dias. Auditar também:
- Diff de cada correção (não criar novos findings).
- Validação real de RLS via dois usuários de teste.
- Teste de penetração leve em `/api/onboarding/*` pós-correção.

---

*Relatório gerado pela skill `security-audit`. Reproduzível via `/security-audit` em qualquer conversa Claude Code neste projeto.*
