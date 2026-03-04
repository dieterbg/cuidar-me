# 🧪 Roteiro de Teste: Fluxo Premium Completo

**Versão:** v1.4.9  
**Data:** 04/03/2026  
**Objetivo:** Validar as interações que um paciente Premium pode ter no app.

---

## Pré-requisitos

- [ ] Paciente cadastrado no sistema com `plan = 'premium'` e `status = 'active'`
- [ ] O paciente usado no teste Freemium pode ter seu plano alterado para Premium no painel Admin (se já estiver 'Ativo', basta mudar o combo 'Plano' para Premium e salvar. Se o Onboarding precisar ser reiniciado, exclua as mensagens antigas via Supabase se desejar, ou teste a ativação diretamente).
- [ ] Número WhatsApp do paciente correto (`whatsapp_number`) — formato `whatsapp:+55...`

---

## TESTE 1: Onboarding Premium

### 1.1 Início do Onboarding
**Ação:** Se o paciente estiver com status "Pendente", edite para "Ativo" e plano "Premium". Alternativamente, se já estiver Ativo, mude para Premium. O onboarding inicial já ocorreu, ou você pode apagar o `onboarding_states` dele no Supabase e disparar manualmente para iniciar.  
**Esperado:**  
- [ ] Recebe mensagem de boas-vindas: "💎 Plano Premium"
- [ ] Pede para responder "Sim"

### 1.2 Resposta "Sim"
**Ação:** Responder "Sim"  
**Esperado:**  
- [ ] Pergunta a preferência de horário para a dica diária personalizada: "Quando prefere receber... A) Manhã B) Tarde C) Noite" (Ao contrário do Freemium, que pula direto).

### 1.3 Resposta "A" (Manhã)
**Ação:** Responder "A"  
**Esperado:**  
- [ ] Recebe confirmação final: "Amanhã às [Xh] dica personalizada + 20h check-in consolidado!"

---

## TESTE 2: Chat Conversacional com IA

### 2.1 Mensagem social
**Ação:** Enviar "Bom dia!" ou "Oi"  
**Esperado:**  
- [ ] Recebe resposta amigável do bot (ex: "Olá! 😊 Como posso te ajudar hoje?"). NÃO recebe bloqueio/upsell.

### 2.2 Pergunta de saúde (Off-topic mas aceita)
**Ação:** Enviar "Qual a melhor hora para comer frutas?"  
**Esperado:**  
- [ ] A IA responde com orientações gerais educacionais.

### 2.3 Rate Limit Premium (30 msgs/dia)
*(Este teste é demorado manualmente, basta verificar se as primeiras mensagens passam sem bloqueio de "Freemium limit").*

---

## TESTE 3: Detecção de Emergência

### 3.1 Emergência Médica
**Ação:** Enviar "Estou sentindo um aperto muito forte no peito e dor de cabeça."  
**Esperado:**  
- [ ] A IA responde com alerta de segurança indicando SAMU/Pronto-socorro.
- [ ] No painel Admin (Aba Paciente), deve aparecer o alerta "Emergência".

---

## TESTE 4: Opt-Out / LGPD

### 4.1 Enviar SAIR
**Ação:** Enviar "SAIR"  
**Esperado:**  
- [ ] Sistema confirma o cancelamento.

---

## TESTE 5: Dashboard Admin e Histórico

### 5.1 Atualização Automática
**Ação:** Veja a página do paciente no /dashboard.  
**Esperado:**  
- [ ] O plano deve constar como `premium`.
- [ ] O histórico de chat deve mostrar a troca de mensagens que ele teve com a IA antes de enviar o "Sair".

---

## Resumo de Validação

| # | Ação | Resposta Esperada | ✅ |
|---|------|-------------------|----|
| 1.1 | Iniciar Onboarding Premium | "💎 Plano Premium... Responda Sim" | ⬜ |
| 1.2 | Responder "Sim" | Solicita preferência (A, B ou C) | ⬜ |
| 1.3 | Responder "A" | Confirmação e finaliza onboarding | ⬜ |
| 2.1 | "Bom dia!" | "Olá! Como posso ajudar?" (chatbot ativado) | ⬜ |
| 2.2 | Pergunta sobre frutas | Resposta útil da IA | ⬜ |
| 3.1 | "Dor forte no peito" | Alerta SAMU/PS e escalonamento na UI | ⬜ |
| 4.1 | "SAIR" | Confirma cancelamento de envio de msgs | ⬜ |
