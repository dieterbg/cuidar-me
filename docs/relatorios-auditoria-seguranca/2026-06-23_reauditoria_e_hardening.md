# Reauditoria e hardening de seguranca - 2026-06-23

**Escopo:** revisao de seguranca apos rotacao de segredos Supabase/Twilio/Cron, ajustes de cron-job.org e endurecimento do codigo.

**Status:** aplicadas as correcoes de maior impacto sem alterar a funcionalidade esperada do app.

**Documento vivo:** ver tambem `docs/SEGURANCA_ATUAL.md`, que consolida controles atuais, aprendizados e pontos criticos do codigo.

## Notas atuais

| Area | Nota | Situacao |
| --- | ---: | --- |
| Segredos e configuracao runtime | 8.5/10 | Service role, Twilio e CRON_SECRET ficam em ambiente servidor. Rotacao feita fora do codigo. |
| Webhooks e cron | 8.5/10 | Cron validado por secret, Twilio validado por assinatura fora de dev local, fila com claim atomico. |
| Autorizacao de server actions | 8.2/10 | Acoes sensiveis agora checam usuario, equipe, admin ou dono do recurso antes do service role. |
| Isolamento de dados de paciente | 8.0/10 | Escritas internas movidas para helpers server-only e metricas exigem paciente autorizado. |
| Supply chain | 7.4/10 | Critical = 0. Next atualizado para 15.5.19. PostCSS forçado em 8.5.15. Restam 5 high ligados principalmente a cadeia Genkit/OpenTelemetry sem fix direto. |
| Observabilidade e auditoria | 7.8/10 | Logs de seguranca/auditoria existem; falta alerta ativo para eventos criticos e politica operacional de revisao. |

**Nota geral tecnica atual:** 8.4/10.

## Ajustes implementados nesta leva

- `package.json` e `package-lock.json`
  - `next` atualizado para `^15.5.19`.
  - `postcss` fixado em `8.5.15` e protegido via `overrides`.
  - `vitest` e `@vitest/ui` atualizados para `^4.1.9`.
- `next.config.js`
  - `serverExternalPackages` para `twilio`, `genkit` e `@genkit-ai/google-genai`, reduzindo peso de bundle servidor no Next 15.
- `src/lib/supabase-server.ts`
  - Compatibilidade com cookies do Next 15 via `UnsafeUnwrappedCookies`.
  - Observacao: antes de migrar para Next 16, refatorar `createClient()` para async.
- `src/app/api/cron/process-message-queue/route.ts`
  - `request.ip` substituido por leitura de `x-forwarded-for`/`x-real-ip`, compativel com Next 15.
- `README.md` e `docs/MASTER-DOC.md`
  - Stack atualizada para Next.js 15.

## Hardening ja aplicado no ciclo

- `src/app/api/process-queue/route.ts`
  - Claim atomico da mensagem pendente para reduzir corrida entre workers.
- `src/app/api/onboarding/consume-invite/route.ts`
  - Consumo atomico de convite e invalidacao segura.
- `src/lib/twilio.ts`
  - Validacao de assinatura Twilio obrigatoria fora de desenvolvimento local.
- `src/lib/message-store.ts`
  - Escrita interna de mensagens separada da server action publica.
- `src/lib/health-metrics-store.ts`
  - Insercao de metricas de saude exige usuario dono do paciente ou equipe.
- `src/ai/tools/schedule-reminder.ts`
  - Agendamento interno de lembretes separado da camada exposta ao usuario.
- `src/ai/actions/messages.ts`, `src/ai/actions-extended.ts`, `src/ai/actions/lab-results.ts`
  - Checagens de autorizacao antes de usar service role.
  - Reducao de exposicao de erro e validacao de tamanho de imagem de exame.

## Validacao executada

- `npm run typecheck` passou.
- `npm test -- --run tests/api/process-queue.test.ts tests/api/consume-invite.test.ts tests/unit/twilio-validation.test.ts tests/unit/actions/messages.test.ts tests/unit/actions/patients.test.ts tests/unit/actions/actions-extended-security.test.ts tests/unit/actions/lab-results-security.test.ts` passou: 7 arquivos, 38 testes.
- `npm run build` passou com Next.js 15.5.19.
- `npm audit --json --strict-ssl=false`:
  - 64 vulnerabilidades restantes: 1 low, 58 moderate, 5 high, 0 critical.
  - Highs restantes concentrados na cadeia Genkit/OpenTelemetry sem fix direto pelo `npm audit`.

## Aprendizados principais

1. Chaves `sb_secret_...` novas do Supabase podem ser menores que JWTs antigos; tamanho visual nao e criterio de seguranca.
2. Service role deve ser usado apenas depois de autenticacao/autorizacao de app, nunca como substituto de permissao.
3. Cron sem secret configurado deve falhar fechado.
4. Twilio webhook precisa validar assinatura em qualquer ambiente que nao seja dev local real.
5. Fila de mensagens precisa de claim atomico porque cron externo e deploys podem gerar concorrencia.
6. Antes de migrar para Next 16, sera necessario remover a compatibilidade sync de cookies usada temporariamente no Next 15.
7. Vulnerabilidades transitive de Genkit/OpenTelemetry exigem decisao de arquitetura ou upgrade upstream, nao apenas `npm audit fix`.

## Pendencias recomendadas

1. **Genkit/OpenTelemetry:** avaliar upgrade/migracao de Genkit ou isolamento operacional dos fluxos de IA para reduzir transitive highs.
2. **Next 16 futuro:** refatorar `src/lib/supabase-server.ts` e seus consumidores para `await cookies()` antes do salto.
3. **Alertas criticos:** enviar e-mail/Slack/WhatsApp interno quando `security_events.severity = critical`.
4. **CI de seguranca:** rodar typecheck, testes criticos, build e audit em pull request; falhar para critical novo e exigir decisao manual para high novo.
5. **Rate limit distribuido:** implementar Redis/Upstash nos endpoints publicos de cron/debug/onboarding/WhatsApp se o app escalar trafego externo.
