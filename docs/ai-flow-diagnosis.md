# 🗺️ Mapeamento do Fluxo de IA e Diagnóstico

Para descobrir exatamente onde a IA está falhando no ambiente de produção (Vercel), fiz um mapeamento passo a passo de todo o ciclo de vida de uma mensagem.

## O Caminho da Mensagem

1. **📱 Recebimento (Twilio Webhook)**
   - O paciente envia a mensagem pelo WhatsApp.
   - O Twilio faz uma requisição POST para a URL do seu aplicativo: `https://cuidar-me-olive.vercel.app/api/whatsapp`.
   - **Arquivo:** `src/app/api/whatsapp/route.ts`

2. **🔐 Validação de Segurança**
   - O sistema valida a assinatura criptográfica para garantir que a requisição veio mesmo do Twilio (`validateTwilioWebhook`).
   - Se falhar, retorna erro `401 Unauthorized` e a execução para aqui.

3. **👤 Identificação e Filtros Iniciais**
   - O sistema busca o paciente no Supabase pelo número de telefone (`findPatientByPhone`).
   - Verifica se não é "SAIR", se o paciente não está em *Onboarding* e aplica o Rate Limiting.
   - **Arquivo:** `src/ai/handle-patient-reply.ts`

4. **🧠 Classificação de Intenção (1ª Chamada à API da IA)**
   - O sistema envia a mensagem para o **Google Gemini** classificar a intenção (ex: é uma pergunta, emergência, etc.).
   - *Tempo estimado:* 2 a 5 segundos.
   - **Arquivo:** `src/ai/message-intent-classifier.ts`

5. **🤖 Geração da Resposta (2ª Chamada à API da IA)**
   - Caso seja classificado como "Pergunta" (Question), o sistema envia todo o contexto novamente para o **Google Gemini** para gerar a resposta textual.
   - *Tempo estimado:* 5 a 8 segundos.
   - **Arquivo:** `src/ai/flows/generate-chatbot-reply.ts`

6. **📤 Envio de Volta**
   - Com o texto pronto, o sistema chama a API do Twilio para disparar a mensagem de volta para o WhatsApp do paciente.
   - **Arquivo:** `src/lib/twilio.ts`

---

## 🛑 Onde está o Real Problema? (Diagnóstico)

Após simular toda a jornada com sucesso localmente, mapeamos que o problema está na **infraestrutura do Vercel**.

### O Gargalo: Limite de Tempo (Timeout)
Você está utilizando o plano **Vercel Hobby** (gratuito). Neste plano, as funções serverless têm um **tempo máximo de execução de exatos 10 segundos**.

Se somarmos os tempos do fluxo:
- Validação + Banco de Dados: `~1s`
- IA Classificação (Gemini): `~3s`
- IA Geração de Resposta (Gemini): `~6s`
- Envio Twilio: `~1s`
- **Total:** `~11 segundos` (ou mais).

> [!CAUTION]
> **A Falha Silenciosa:** Assim que o relógio bate 10.00s, o Vercel **MATA** o processo subitamente. A mensagem nunca chega à etapa 6 (Twilio) e nenhum erro é gerado no banco de dados porque o servidor foi desligado no meio do pensamento da IA.

### Como Resolver?
Para um assistente de IA no WhatsApp, o ideal é **desacoplar** o recebimento da mensagem do processamento da IA:

- **Plano A (Ideal):** O Webhook no passo 1 apenas salva a pergunta no banco de dados como "pendente" e retorna 'OK' para o Twilio imediatamente (em milissegundos). Um processador em background (como Inngest ou Edge Functions) assume o processamento demorado.
- **Plano B:** Fazer o upgrade para o Vercel Pro (que permite até 300 segundos de timeout).
- **Plano C:** Migrar a função do webhook para o `Edge Runtime` da Vercel (que permite até 30 segundos no plano Hobby), embora dependa da compatibilidade das bibliotecas usadas (Twilio SDK).
