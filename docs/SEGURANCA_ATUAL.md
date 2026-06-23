# Seguranca atual do Cuidar.me

Atualizado em 2026-06-23.

Este documento consolida o estado atual de seguranca do app apos a rotacao de segredos, ajuste do cron-job.org, hardening de server actions, validacao Twilio, melhoria da fila de mensagens e atualizacao de dependencias.

## Resumo executivo

O app esta em um nivel bom para piloto controlado, desde que os segredos continuem fora do codigo e que o Supabase mantenha RLS/roles coerentes. A superficie mais sensivel hoje e formada por mensagens WhatsApp, dados clinicos de paciente, service role do Supabase, cron jobs e fluxos de IA.

Nota tecnica atual: **8.4/10**.

| Area | Nota | Leitura rapida |
| --- | ---: | --- |
| Segredos e ambiente | 8.5/10 | Chaves estao em variaveis de ambiente; service role nao aparece em codigo cliente. |
| Cron e webhooks | 8.5/10 | Cron exige secret; Twilio exige assinatura fora de dev local. |
| Autorizacao | 8.2/10 | Server actions sensiveis agora passam por helpers de auth antes de service role. |
| Dados de paciente | 8.0/10 | Escritas internas foram separadas; leituras/escritas criticas checam dono ou equipe. |
| Supply chain | 7.4/10 | 0 critical; restam highs ligados principalmente a Genkit/OpenTelemetry sem fix direto. |
| Observabilidade | 7.8/10 | Logs existem; falta alerta ativo para evento critico. |

## Controles que existem hoje

### Segredos

- `SUPABASE_SERVICE_ROLE_KEY` fica apenas em ambiente servidor.
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` podem ser publicas por natureza, mas dependem de RLS correto.
- `CRON_SECRET` protege endpoints de cron.
- Credenciais Twilio foram rotacionadas e devem ficar em Vercel/Supabase secret storage, nao em arquivos.
- O bloco `env` do `next.config.js` nao deve receber segredo servidor, porque o Next pode embutir valores no bundle.

### Autenticacao e autorizacao

- `src/lib/authz.ts` centraliza:
  - usuario autenticado;
  - `requireAdmin`;
  - `requireStaff`;
  - `requirePatientOwnerOrStaff`.
- O padrao recomendado e: autenticar com sessao normal, autorizar, e so depois usar service role quando a operacao precisar bypassar RLS.

### Cron

- `src/lib/cron-auth.ts` falha fechado se `CRON_SECRET` estiver ausente.
- Endpoints de cron aceitam `Authorization: Bearer <secret>`, `x-cron-secret` ou `?token=...`.
- No cron-job.org, preferir header `Authorization: Bearer <CRON_SECRET>`; `?token=` funciona, mas deixa o segredo mais exposto em historico/logs.

### Twilio

- `src/lib/twilio.ts` valida `x-twilio-signature`.
- `SKIP_TWILIO_VALIDATION=1` so e aceito em dev local real.
- Fora da janela WhatsApp de 24h, mensagens proativas devem usar template aprovado; fallback para body foi evitado quando template falha.

### Fila de mensagens

- `src/app/api/process-queue/route.ts` processa no maximo uma mensagem por chamada.
- O worker marca a mensagem como `processing` com condicao `status = pending`; se outro worker pegou antes, a chamada retorna sucesso sem duplicar envio.
- Logs nao devem conter `whatsapp_number`, texto de mensagem ou nome do paciente.

### Convites e onboarding

- `src/app/api/onboarding/consume-invite/route.ts` deriva `userId` da sessao, nunca do body.
- O consumo do convite e atomico: atualiza `used_by`/`used_at` apenas quando `used_at` ainda e nulo e o token nao expirou.

### Exames e dados clinicos

- `src/ai/actions/lab-results.ts` valida tamanho/formato do upload antes do processamento.
- A permissao e checada antes de criar cliente service role.
- O WhatsApp de destino vem do paciente no banco; o numero enviado pelo caller so e fallback para staff.

### Supply chain

- Next atualizado para `15.5.19`.
- PostCSS fixado em `8.5.15` via dependencia direta e `overrides`.
- Build de producao passa em Next 15.
- Auditoria atual: 64 vulnerabilidades, 0 critical, 5 high, 58 moderate, 1 low.

## Aprendizados importantes

1. **Chave nova do Supabase pode ser menor.** As chaves `sb_secret_...` novas podem parecer menores que JWTs antigos; o ponto importante e tipo, escopo e onde ela e usada.
2. **Service role nunca deve ir para cliente.** Mesmo uma unica importacao errada pode expor bypass total de RLS.
3. **Autorizacao antes do service role.** Service role e ferramenta interna, nao mecanismo de permissao. Permissao vem da sessao e das regras de negocio.
4. **Cron precisa falhar fechado.** Se `CRON_SECRET` nao existe, endpoint deve negar, nao abrir.
5. **Webhook Twilio sem assinatura e porta aberta.** Pular validacao so em dev local evita que previews/producoes aceitem POST falso.
6. **URL com token funciona, mas header e melhor.** Query string tende a aparecer em historico, prints e logs.
7. **Fila precisa ser idempotente.** Cron a cada 5 minutos e deploys concorrentes podem bater ao mesmo tempo.
8. **Next 15 mudou cookies.** `cookies()` agora e async, mas Next 15 ainda aceita compatibilidade sync; antes de Next 16, refatorar.
9. **Build pode revelar dependencias pesadas.** Twilio/Genkit devem ficar externalizados no servidor para evitar bundle enorme.
10. **Auditoria de dependencias nao e binaria.** `npm audit` ainda acusa Genkit/OpenTelemetry, mas sem fix direto simples; isso exige decisao de arquitetura, nao so `npm audit fix`.

## Comentarios importantes no codigo

Os comentarios adicionados devem proteger decisoes de seguranca, nao explicar obviedades. Pontos principais:

- `src/lib/authz.ts`: explica o padrao de autorizacao centralizada.
- `src/lib/cron-auth.ts`: explica falha fechada e preferencia por header.
- `src/lib/message-store.ts`: marca helper como escrita interna, nao action publica.
- `src/lib/health-metrics-store.ts`: lembra que caller precisa autorizar antes de gravar.
- `src/lib/twilio.ts`: documenta o motivo de nao pular assinatura fora de dev local.
- `src/app/api/process-queue/route.ts`: documenta claim atomico e remocao de PII dos logs.
- `src/app/api/onboarding/consume-invite/route.ts`: documenta consumo atomico e userId derivado da sessao.
- `src/ai/actions/lab-results.ts`: documenta autorizacao antes do service role e fallback restrito de WhatsApp.
- `src/lib/supabase-server.ts`: documenta compatibilidade temporaria com cookies sync no Next 15.

## Pendencias priorizadas

1. Implementar alerta ativo quando `security_events.severity = critical`.
2. Avaliar migracao/isolamento de Genkit para reduzir highs de OpenTelemetry.
3. Criar CI com `typecheck`, testes criticos, build e `npm audit`.
4. Adicionar rate limit distribuido em endpoints externos se houver aumento de trafego.
5. Refatorar `createClient()` para async antes de migrar para Next 16.

## Comandos de validacao

```bash
npm run typecheck
npm test -- --run tests/api/process-queue.test.ts tests/api/consume-invite.test.ts tests/unit/twilio-validation.test.ts tests/unit/actions/messages.test.ts tests/unit/actions/patients.test.ts tests/unit/actions/actions-extended-security.test.ts tests/unit/actions/lab-results-security.test.ts
npm run build
npm audit --json --strict-ssl=false
```

## Regra pratica para proximas mudancas

Toda mudanca que tocar paciente, mensagem, cron, Twilio, Supabase service role ou IA deve responder tres perguntas antes de merge:

1. Quem pode chamar isso?
2. De quem sao os dados acessados?
3. O que acontece se duas chamadas iguais ocorrerem ao mesmo tempo?
