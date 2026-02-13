# 📡 API Reference — Cuidar.me

Documentação dos endpoints HTTP disponíveis na aplicação.

> **Base URL:** `https://seu-dominio.vercel.app`

---

## Autenticação

Os endpoints de cron utilizam um secret passado via header:

```
Authorization: Bearer <CRON_SECRET>
```

O endpoint do WhatsApp é autenticado automaticamente via [validação de assinatura Twilio](https://www.twilio.com/docs/usage/security#validating-requests).

---

## Endpoints

### POST `/api/whatsapp`

**Webhook receptor de mensagens do Twilio.** Recebe mensagens WhatsApp dos pacientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `From` | `string` | Número WhatsApp do paciente (ex: `whatsapp:+5511999990001`) |
| `Body` | `string` | Texto da mensagem |
| `ProfileName` | `string` | Nome do perfil WhatsApp |

- **Content-Type:** `application/x-www-form-urlencoded` (form data do Twilio)
- **Autenticação:** Validação de assinatura Twilio (`X-Twilio-Signature`)
- **Resposta:** TwiML XML vazio (200)
- **Processamento:** Fire-and-forget — responde ao Twilio imediatamente e processa em background

```
200 → TwiML XML (sucesso)
400 → Missing required fields: From or Body
401 → Invalid Twilio Signature
500 → Webhook Error: <message>
```

---

### POST `/api/onboarding/initiate`

**Inicia o onboarding WhatsApp de um paciente.** Envia a mensagem de boas-vindas.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `patientId` | `string` | ✅ | ID do paciente no Supabase |

- **Content-Type:** `application/json`
- **Autenticação:** Nenhuma (chamado internamente pelo frontend)

```json
// Sucesso (200)
{ "success": true, "message": "WhatsApp onboarding initiated successfully" }

// Erros
{ "success": false, "error": "Patient ID required" }          // 400
{ "success": false, "error": "Patient not found" }             // 404
{ "success": false, "error": "Onboarding already in progress" } // 200
{ "success": false, "error": "Onboarding already completed" }   // 200
{ "success": false, "error": "WhatsApp number not registered" } // 200
```

---

### GET|POST `/api/cron/process-message-queue`

**Processa a fila de mensagens agendadas.** Envia mensagens pendentes do protocolo e processa check-ins perdidos.

- **Autenticação:** `Authorization: Bearer <CRON_SECRET>`
- **Frequência recomendada:** A cada hora
- **Limite:** Processa até 50 mensagens por ciclo

```json
// Sucesso (200)
{
  "success": true,
  "processed": 12,
  "missedCheckinsProcessed": 3,
  "timestamp": "2026-02-12T18:00:00.000Z"
}

// Erro (401)
{ "error": "Unauthorized" }

// Erro (500)
{ "success": false, "error": "<message>" }
```

---

### GET|POST `/api/cron/schedule-protocol-messages`

**Agenda mensagens de protocolo para o dia.** Verifica pacientes com protocolo ativo e agenda as mensagens do dia.

- **Autenticação:** `Authorization: Bearer <CRON_SECRET>`
- **Frequência recomendada:** Diário, 6h da manhã

```json
// Sucesso (200)
{
  "success": true,
  "messagesScheduled": 24,
  "protocolsCompleted": 1,
  "timestamp": "2026-02-12T09:00:00.000Z"
}

// Erro (401)
{ "error": "Unauthorized" }

// Erro (500)
{ "success": false, "error": "<message>" }
```

---

### GET|POST `/api/cron/send-daily-checkins`

**Envia check-ins diários de gamificação.** Seleciona pacientes ativos e envia check-ins baseados no turno (manhã/tarde/noite).

- **Autenticação:** `Authorization: Bearer <CRON_SECRET>`
- **Frequência recomendada:** A cada hora (cobre turnos 8h, 14h, 20h)

```json
// Sucesso (200)
{
  "success": true,
  "processed": 8,
  "skipped": 2,
  "timestamp": "2026-02-12T14:00:00.000Z"
}

// Erro (401)
{ "error": "Unauthorized" }

// Erro (500)
{ "success": false, "error": "<message>" }
```

---

## Configuração de Cron Jobs

Para configurar no Vercel ou serviço externo:

| Endpoint | Frequência | Horário |
|----------|-----------|---------|
| `/api/cron/schedule-protocol-messages` | Diário | 6:00 AM (BRT) |
| `/api/cron/send-daily-checkins` | A cada hora | Todos os horários |
| `/api/cron/process-message-queue` | A cada hora | Todos os horários |

Todas as chamadas devem incluir o header `Authorization: Bearer <CRON_SECRET>`.
