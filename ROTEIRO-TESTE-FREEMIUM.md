# 🧪 Roteiro de Teste: Fluxo Freemium Completo

**Versão:** v1.4.8  
**Data:** 04/03/2026  
**Objetivo:** Validar TODAS as interações que um paciente Freemium pode ter no app.

---

## Pré-requisitos

- [ ] Paciente cadastrado no sistema com `plan = 'freemium'` e `status = 'active'`
- [ ] Número WhatsApp do paciente correto no campo `whatsapp_number`
- [ ] Onboarding já iniciado (ou reiniciar para testar)
- [ ] Build v1.4.8+ deployada no Vercel

---

## TESTE 1: Onboarding Freemium

### 1.1 Início do Onboarding
**Ação:** No painel admin, ir na página do paciente e clicar "Iniciar Protocolo" (ou disparar onboarding manualmente)  
**Esperado:**  
- [ ] Paciente recebe mensagem de boas-vindas no WhatsApp
- [ ] Mensagem contém: "🌱 Plano: Freemium"
- [ ] Mensagem menciona: "dica de saúde todo dia pela manhã (8h)"
- [ ] Mensagem menciona: "Conheça o Plano Premium" (upsell suave)
- [ ] Mensagem pede: "Responda Sim para continuar"
- [ ] **NÃO** promete check-in diário, IA 24h, ou gamificação

### 1.2 Resposta "Sim"
**Ação:** Responder "Sim" no WhatsApp  
**Esperado:**  
- [ ] Sistema responde com mensagem de conclusão
- [ ] Mensagem contém: "A partir de amanhã às 8h você receberá sua Dica de Saúde diária"
- [ ] Mensagem contém upsell para Premium
- [ ] **NÃO** pede escolha de horário (fixo 8h para Freemium)
- [ ] **NÃO** menciona check-in, gamificação ou pontos
- [ ] Paciente muda para `status = 'active'` no banco

### 1.3 Resposta "Ajustar"
**Ação:** Responder "Ajustar" no WhatsApp (se onboarding ainda ativo)  
**Esperado:**  
- [ ] Sistema responde com link para editar perfil
- [ ] **NÃO** avança o onboarding
- [ ] Pede para voltar e mandar "Sim" depois

### 1.4 Resposta inválida
**Ação:** Responder algo diferente de "Sim"/"Ajustar" (ex: "Talvez")  
**Esperado:**  
- [ ] Sistema responde: "Responda Sim para começar ou Ajustar para alterar seus dados"
- [ ] **NÃO** avança o onboarding

---

## TESTE 2: Bloqueio de Conversa (Freemium Gate)

### 2.1 Mensagem social
**Ação:** Enviar "Bom dia!" pelo WhatsApp  
**Esperado:**  
- [ ] Recebe mensagem de **upsell**, NÃO uma resposta conversacional
- [ ] Mensagem contém: "No plano Gratuito, você recebe dicas de saúde diárias às 8h"
- [ ] Mensagem lista benefícios do Premium (IA 24h, check-in, gamificação)
- [ ] **NÃO** ativa a IA conversacional (sem custo Gemini)

### 2.2 Pergunta de saúde
**Ação:** Enviar "Posso comer chocolate à noite?"  
**Esperado:**  
- [ ] Recebe **mesmo upsell** do teste 2.1
- [ ] **NÃO** recebe resposta da IA sobre chocolate
- [ ] **NÃO** consome tokens Gemini para resposta (classificação sim, resposta NÃO)

### 2.3 Mensagem aleatória
**Ação:** Enviar "kkkk" ou "👍" ou qualquer emoji  
**Esperado:**  
- [ ] Recebe **upsell** (mesmo comportamento)
- [ ] **NÃO** recebe "Olá! Como posso te ajudar?"

### 2.4 Múltiplas mensagens (rate limit)
**Ação:** Enviar 6+ mensagens em sequência  
**Esperado:**  
- [ ] Primeiras 5 mensagens recebem upsell
- [ ] A partir da 6ª: mensagem de rate limit específica
- [ ] Mensagem de rate limit menciona upgrade para Premium

---

## TESTE 3: Detecção de Emergência (Freemium NÃO bloqueia)

### 3.1 Emergência por keyword
**Ação:** Enviar "Estou com dor forte no peito"  
**Esperado:**  
- [ ] **NÃO** recebe upsell — emergência tem prioridade
- [ ] Recebe mensagem de segurança padrão com números de emergência
- [ ] Mensagem contém: SAMU 192, Pronto-socorro, CVV 188
- [ ] **NÃO** escala para equipe da clínica (Freemium não tem esse benefício)

### 3.2 Emergência mental
**Ação:** Enviar "Não aguento mais, quero sumir"  
**Esperado:**  
- [ ] **NÃO** recebe upsell
- [ ] Recebe mensagem de segurança com CVV 188
- [ ] **NÃO** escala para equipe da clínica

> 💡 **Diferença Premium/VIP:** Pacientes pagos recebem escalação real para a equipe de saúde. Freemium recebe orientação padrão.

---

## TESTE 4: Opt-Out (SAIR)

### 4.1 Enviar SAIR
**Ação:** Enviar "SAIR" pelo WhatsApp  
**Esperado:**  
- [ ] Sistema confirma cancelamento
- [ ] Paciente muda para `status = 'inactive'` ou equivalente
- [ ] Para de receber dicas diárias
- [ ] **NÃO** recebe upsell (opt-out tem prioridade sobre Freemium gate)

### 4.2 Variações de opt-out
**Ação:** Testar "sair", "STOP", "cancelar", "parar"  
**Esperado:**  
- [ ] Todas as variações funcionam igualmente

---

## TESTE 5: Dica Diária (Cron Job 8h)

### 5.1 Recebimento da dica
**Ação:** Aguardar às 8h da manhã (ou disparar manualmente via `/api/cron/send-freemium-tips`)  
**Esperado:**  
- [ ] Paciente Freemium ativo recebe dica genérica de saúde
- [ ] Mensagem contém: "Bom dia, [Nome]!"
- [ ] Mensagem contém CTA: "Quer suporte 24h e check-in diário? Conheça o Plano Premium!"
- [ ] Dica varia a cada dia (7 dicas rotativas baseadas no dia do mês)

### 5.2 Resposta à dica
**Ação:** Responder à dica com "Obrigado pela dica!"  
**Esperado:**  
- [ ] Recebe **upsell** (conversa bloqueada para Freemium)
- [ ] **NÃO** recebe resposta da IA

### 5.3 Paciente inativo não recebe
**Ação:** Verificar após opt-out  
**Esperado:**  
- [ ] Paciente com `status != 'active'` **NÃO** recebe dica

---

## TESTE 6: Dashboard Admin (Visão do Paciente Freemium)

### 6.1 Histórico de mensagens
**Ação:** Abrir página do paciente no dashboard  
**Esperado:**  
- [ ] Todas as mensagens (dicas, upsells, opt-out) aparecem no histórico
- [ ] Mensagens do paciente aparecem como bolhas do lado direito
- [ ] Mensagens do sistema aparecem como bolhas do lado esquerdo

### 6.2 Informações do paciente
**Ação:** Verificar dados na página do paciente  
**Esperado:**  
- [ ] Plano exibido como "Freemium"
- [ ] Status exibido como "Ativo"

---

## TESTE 7: Número de Telefone

### 7.1 Formato correto
**Ação:** Enviar "Oi" de um número cadastrado  
**Esperado:**  
- [ ] Sistema encontra o paciente (não recebe "você precisa ter cadastro")
- [ ] Recebe upsell (Freemium gate)

### 7.2 Número não cadastrado
**Ação:** Enviar "Oi" de um número NÃO cadastrado  
**Esperado:**  
- [ ] Recebe: "Para utilizar nossa assistente virtual, você precisa ter um cadastro ativo"
- [ ] URL NÃO é /cadastro (404 corrigido)

---

## Resumo de Validação

| # | Você envia / faz | Resposta esperada do sistema | ✅ |
|---|-----------------|-----------------------------|----|
| **ONBOARDING** | | | |
| 1.1 | Admin inicia onboarding | "🌱 Plano: Freemium... dica de saúde todo dia às 8h... Responda Sim" | ⬜ |
| 1.2 | "Sim" | "A partir de amanhã às 8h receberá sua Dica de Saúde diária... 💎 Plano Premium..." | ⬜ |
| 1.3 | "Ajustar" | Link para editar perfil. NÃO avança. | ⬜ |
| 1.4 | "Talvez" (inválido) | "Responda Sim para começar ou Ajustar para alterar seus dados" | ⬜ |
| **BLOQUEIO DE CHAT** | | | |
| 2.1 | "Bom dia!" | Upsell: "No plano Gratuito, recebe dicas às 8h. 💎 Premium tem IA 24h..." | ⬜ |
| 2.2 | "Posso comer chocolate?" | Mesmo upsell. NÃO responde a pergunta. | ⬜ |
| 2.3 | "kkkk" ou 👍 | Mesmo upsell. NÃO responde "Como posso te ajudar?" | ⬜ |
| 2.4 | 6+ mensagens seguidas | 5 primeiras = upsell. 6ª+ = rate limit com menção a Premium. | ⬜ |
| **EMERGÊNCIA** | | | |
| 3.1 | "Dor forte no peito" | "⚠️ Procure atendimento: 🚑 SAMU 192 / 🏥 Pronto-socorro". NÃO escala clínica. | ⬜ |
| 3.2 | "Não aguento mais" | Mensagem segurança com 📞 CVV 188. NÃO escala clínica. | ⬜ |
| **OPT-OUT** | | | |
| 4.1 | "SAIR" | Confirma cancelamento. Status → inativo. Para dicas. | ⬜ |
| 4.2 | "stop" / "cancelar" / "parar" | Mesmo efeito que SAIR. | ⬜ |
| **DICA DIÁRIA** | | | |
| 5.1 | Aguardar 8h (ou disparar cron) | "Bom dia, [Nome]! 💧 Dica do Cuidar... 💡 Conheça Premium!" | ⬜ |
| 5.2 | Responder à dica | Upsell (conversa bloqueada). NÃO resposta IA. | ⬜ |
| 5.3 | (após opt-out) | NÃO recebe dica. | ⬜ |
| **DASHBOARD** | | | |
| 6.1 | Abrir página do paciente | Histórico com todas mensagens (dicas, upsells, segurança). | ⬜ |
| 6.2 | Verificar dados | Plano = Freemium, Status = Ativo. | ⬜ |
| **TELEFONE** | | | |
| 7.1 | Enviar msg de nº cadastrado | Sistema encontra paciente → upsell (não "precisa cadastro"). | ⬜ |
| 7.2 | Enviar msg de nº desconhecido | "Precisa ter cadastro ativo" + link para clinicadornelles.com.br. | ⬜ |

