# Reauditoria pré-lançamento — Cuidar.me — 2026-09-25

**Escopo:** full-repo, com foco nos 22 commits desde a auditoria de 2026-04-18 (`b7feec8..e5feaa5`)
**Auditor:** Claude (skill `security-audit`)
**Nota antes das correções:** 6,5/10 — 🔴 não lançar
**Nota após as correções:** 8/10 — 🟡 pronto para beta controlado (após aplicar a migration)

---

## Achados e status

| # | Sev. | Achado | Status |
|---|---|---|---|
| 1 | 🔴 | `profiles`: policy de UPDATE do próprio perfil sem restrição de colunas → paciente fazia `role='admin'` | ✅ Corrigido — migration `20260925_protect_privileged_columns.sql` |
| 2 | 🔴 | Cadastro envia `role` no metadata do signup → cadastro direto como admin | ✅ Corrigido — mesma migration (rebaixa para `pendente`) |
| 3 | 🔴 | Next.js 15.5.19 com advisories críticos (RCE) | ✅ Atualizado para 15.5.24 |
| 4 | 🟠 | `seedDatabase` server action pública com service-role, trava de produção comentada | ✅ `requireAdmin()` + bloqueio em `VERCEL_ENV=production` |
| 5 | 🟠 | Paciente podia alterar o próprio `plan`/`status`/`risk_level` via API | ✅ Trigger em `patients` |
| 6 | 🟠 | `awardGamificationPoints` exposta ao navegador com pontos definidos pelo cliente | ✅ Núcleo movido para `src/lib/gamification-core.ts` (não exposto); ações web presas à sessão; `awardProfileCompletionPoints()` valida perfil no servidor e concede só 1x |
| 7 | 🟡 | IA (`suggestWhatsappReplies`, `generateProtocol`, `getChatAnalysis`) sem login → abuso de custo Gemini | ✅ `requireStaff()` |
| 8 | 🟡 | Loja aceitava `userId` do cliente; voucher com `Math.random` | ✅ Sessão obrigatória; voucher com `crypto.randomBytes` |
| 9 | 🟡 | `createPatientRecord` aceitava `gamification` do cliente | ✅ Só staff |

## Verificação de não-regressão

- `tsc --noEmit`: 0 erros
- `vitest`: **260/260** (253 originais com asserções inalteradas + 7 novos de segurança)
- `next build`: OK, 42/42 páginas; único aviso é pré-existente (`@supabase/realtime-js`)
- Migration testada em PostgreSQL real (PGlite) com imitação do Supabase: **20/20 cenários**, incluindo
  fluxos legítimos (consentimento, edição de perfil, gamificação, upgrade pela equipe, webhooks,
  tela de admin, scripts) e idempotência (aplicada 2×).

## Pendências (não bloqueiam o beta)

1. **Bug funcional — plano do convite não é gravado.** `portal/layout.tsx` calcula `patientPlan` a partir
   do convite, mas `createPatientRecord` não recebe/grava `plan`. Convites premium/VIP criam paciente
   freemium (a menos que o paciente já existisse no momento do consumo). Precisa de decisão de negócio.
   Correção sugerida: `createPatientRecord` ler `invite_plan` no servidor (service-role) e gravar o plano.
2. `gamification` em `patients` ainda é gravável pelo próprio paciente via API direta (necessário hoje
   para `streak.ts`/`badges.ts`). Mover essas escritas para service-role e então proteger a coluna.
3. `awardNewBadges`/`getUserBadges` aceitam `userId` do cliente (sem ganho de pontos, só leitura/recalculo).
4. Itens do `BACKLOG-SEGURANCA.md`: PITR/backup, alertas críticos por e-mail, rate-limit distribuído.
5. As migrations do repo não refletem 100% o banco de produção (ex.: não há policy de INSERT em
   `patients`, mas o cadastro funciona). Recomenda-se exportar o schema real (`supabase db dump`).

## Ações do operador

1. Rodar `supabase/migrations/20260925_protect_privileged_columns.sql` no SQL Editor.
2. Conferir: `SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname LIKE 'app_protect_%';` → 2 linhas.
3. Conferir se já existe algum admin indevido:
   `SELECT id, email, role, created_at FROM profiles WHERE role IN ('admin','equipe_saude','assistente') ORDER BY created_at;`
