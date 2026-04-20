# Backlog de Segurança — Cuidar.me

Itens identificados na auditoria de segurança que **não têm bloqueador imediato** mas
devem ser endereçados em sprints futuras. Ordenados por prioridade.

Última atualização: 2026-04-20
Auditoria de referência: `docs/relatorios-auditoria-seguranca/2026-04-18_auditoria_inicial.md`

---

## 🟡 MEDIUM-2 — Rate limiting in-memory ineficaz em serverless

**Origem:** Auditoria 2026-04-18
**Arquivo:** `src/lib/rate-limit.ts:17`

**Problema:**
O rate limiter atual usa `new Map<string, RequestLog>()` em memória. Em produção no
Vercel, cada instância serverless tem seu próprio Map isolado. Com N instâncias
rodando em paralelo, um atacante consegue fazer N× o limite configurado (ex.: limite
de 10 req/min vira 50 com 5 instâncias). Além disso, o Map reseta a cada deploy.

**Impacto:** Endpoints públicos críticos (`/api/whatsapp`, `/api/onboarding/*`) ficam
expostos a flood/spam além do limite nominal.

**Remediação:**
- Migrar para **Upstash Redis** (free tier disponível) ou **Vercel KV**
- Alternativamente, configurar regras de rate limit diretamente no **Vercel Firewall**
  ou **Cloudflare** (zero código, mais robusto)

**Esforço:** M (1–2 dias)
**Sprint sugerida:** Fase 4

---

## 🟢 LOW-2 — Alertas críticos não enviam e-mail/SMS

**Origem:** Auditoria 2026-04-18
**Arquivo:** `src/lib/logger.ts:249`

**Problema:**
`security_events` com `severity = 'critical'` são gravados na tabela do Supabase mas
ninguém recebe notificação proativa. Um ataque em andamento (ex.: flood de
`invalid_twilio_signature`, `rls_denied` em volume) só seria detectado se alguém
abrir o painel de logs manualmente.

**Impacto:** Tempo de resposta a incidentes aumenta de minutos para horas/dias.

**Remediação:**
- Implementar **Fase 4 do roadmap de logs**: cron que lê `security_events` recentes
  com `severity = 'critical'` e envia e-mail via Resend/SendGrid para o DPO/admin
- Documentado em `docs/LOGS_AUDITORIA_LGPD.md` — Fase 4

**Esforço:** M (1 dia + configuração Resend)
**Sprint sugerida:** Fase 4

---

## 🟢 LOW-3 — Sem backup testado / plano de disaster recovery

**Origem:** Auditoria 2026-04-18
**Localização:** Supabase project settings (não no código)

**Problema:**
Não há evidência de que PITR (Point-In-Time Recovery) esteja habilitado no Supabase,
nem de que um restore real tenha sido testado. Um `DELETE FROM patients` acidental,
ataque de ransomware, ou falha de migração poderia resultar em **perda total de dados**
de pacientes — violação grave de LGPD e CFM (Art. 8 — prontuário 20 anos).

**Impacto:** Catastrófico. Sem recovery, dados de saúde de todos os pacientes
poderiam ser irrecuperáveis.

**Remediação:**
1. Habilitar **PITR no Supabase** (requer plano Pro, ~$25/mês)
   - Supabase Dashboard → Settings → Addons → Point in Time Recovery
2. Criar `docs/DISASTER_RECOVERY.md` com runbook:
   - Como fazer restore de PITR
   - Como restaurar para ambiente de staging para validação
   - Contatos de emergência (DPO, CTO, Supabase support)
3. Executar **1 teste real de restore** em staging a cada trimestre
4. Alternativa de custo zero no curto prazo: pg_dump diário via GitHub Actions
   para bucket S3/R2 privado e criptografado

**Esforço:** M (infra + documentação + teste = ~1 dia)
**Sprint sugerida:** Próxima sprint de infraestrutura

---

## 🔵 RECOMENDAÇÕES GERAIS (além dos findings)

Itens do relatório de auditoria que são boas práticas mas não têm severidade direta:

| # | Item | Esforço | Sprint |
|---|---|---|---|
| R1 | Migrar Next.js 14.x → 15.x ou 16.x (CVEs de DoS) | L (breaking changes) | Sprint dedicada |
| R2 | Integrar Sentry com PII scrubbing | M | Fase 4 |
| R3 | Testes de autorização por API route (401/403) | M | Fase 5 |
| R4 | CI com `npm audit` — falhar build em critical/high novos | S | Próxima sprint |
| R5 | Rotação programada de secrets (90 dias — Twilio, Supabase) | S | Recorrente |
| R6 | Script SQL periódico: listar tabelas sem RLS ou sem policy INSERT/UPDATE/DELETE | S | Próxima sprint |
| R7 | Threat modeling de prompt injection no Gemini | M | Fase 5 |
| R8 | CSP completa (modo Report-Only → enforcement) | M | Fase 4 |

---

## Histórico de fechamento

| Data | Item | Commit |
|---|---|---|
| 2026-04-20 | CRITICAL 1–5 | `82681ca` |
| 2026-04-20 | HIGH 1–4 | `d32c5fa` |
| 2026-04-20 | MEDIUM 1, 3, 4, 5 | `502216a` |
| 2026-04-20 | LOW-1 | `502216a` |
