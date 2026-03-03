# 📊 Estratégia de Produto: Escalonamento de Valor (Tiers)

**Última atualização:** 03/03/2026  
**Baseado em:** PLG (Product Led Growth) + Psicologia do Produto  
**Objetivo:** Otimizar custo de operação (Twilio/Gemini) e maximizar conversão.

---

## Visão Geral

O Cuidar.me opera com 3 planos escalonados que movem o paciente de **awareness** (consciência) 
para **habit building** (construção de hábito) até **total care** (cuidado total).

```
  🥉 Freemium          🥈 Premium              🥇 VIP
  "A Semente"          "O Companheiro"          "O Concierge"
  ──────────────────────────────────────────────────────────
  Awareness            Habit Building           Total Care
  Broadcast only       Proativo + Interativo    Hiper-Personalizado
  R$0                  R$29,90/mês (sugestão)   R$79,90/mês (sugestão)
```

---

## 🥉 PLANO FREEMIUM: "A Semente"

### Filosofia
> "Eu te dou um presente toda manhã."

O objetivo é manter a marca na mente do usuário **sem custo operacional de conversa**.
Move o custo de IA de "Conversacional" (caro/volátil) para "Agendado" (previsível).

### Interações Diárias

| Horário | Tipo | Descrição |
|---------|------|-----------|
| 08:00 | 📤 Broadcast | Dica do Dia (saúde genérica) — [Banco de 7 dicas rotativas] |

### Regras de Conversa

- **Conversa: DESABILITADA**
- Se o paciente enviar qualquer mensagem → responde com **upsell para Premium**
- Não consome tokens Gemini (sem IA conversacional)
- Não tem check-in, gamificação, nem protocolos

### Exemplo de Mensagem Diária
```
Bom dia, Dieter! 💧 Dica do Cuidar: Sabia que beber água em jejum 
ajuda a despertar o metabolismo? Que tal começar com um copo agora? 🌅

💡 _Quer suporte 24h e check-in diário? Conheça o Plano Premium!_
```

### Exemplo de Upsell (quando tenta conversar)
```
Obrigado pela sua mensagem! 😊

No plano Gratuito, o chat com IA não está disponível. 
Mas temos ótimas notícias! 

💎 Com o Plano Premium você tem:
✅ Assistente de saúde com IA 24h
✅ Check-in diário personalizado
✅ Gamificação e conquistas
✅ Protocolos de acompanhamento

Fale com a clínica para fazer o upgrade! 🚀
```

### Onboarding WhatsApp

1. **Welcome:** "Olá! 🌱 Plano Freemium. Receberá uma dica de saúde todo dia às 8h."
2. **Complete (após "Sim"):** "A partir de amanhã às 8h receberá sua Dica de Saúde diária!"
   - Pula etapa de preferência de horário (fixo: manhã)

### Custo Operacional
- **Twilio:** 1 mensagem/dia × $0.008 = ~**R$ 0,24/mês** por paciente
- **Gemini:** R$ 0,00 (sem IA conversacional)
- **Total:** ~**R$ 0,24/mês** por paciente

### Gatilho de Conversão → Premium
- CTA no rodapé da dica diária
- Upsell automático ao tentar conversar
- Após 14 dias: mensagem especial "Quer experimentar o Premium por 7 dias grátis?"

---

## 🥈 PLANO PREMIUM: "O Companheiro"

### Filosofia
> "Eu te ajudo a não desistir."

A transformação acontece através do **acompanhamento ativo**. O paciente sente o valor
do monitoramento e da conveniência de ter uma IA que conhece seus hábitos.

### Interações Diárias

| Horário | Tipo | Descrição |
|---------|------|-----------|
| Manhã (horário escolhido) | 📤 Proativo | Dica personalizada baseada no perfil/protocolo |
| 20:00 | 📤 Check-in | Check-in consolidado: água, alimentação, exercício, bem-estar |
| Qualquer hora | 💬 Reativo | Assistente de saúde com IA (Gemini) — **30 msgs/dia** |

### Regras de Conversa

- **Chat IA:** Habilitado (30 mensagens/dia)
- **Classificação de intenção:** Sim (Emergency, Social, Question, Check-in, Off-topic)
- **Gamificação:** Pontos, níveis, badges, streaks
- **Protocolos:** Acesso a protocolos personalizados da clínica
- **Escalação:** Alerta para equipe de saúde em emergências (prioridade normal)

### Exemplo de Dica Personalizada (Manhã)
```
Bom dia, Maria! 🌅

Ontem você registrou 1.5L de água — faltou um pouco para a meta de 2L! 
Hoje comece com um copo grande logo de manhã. 💧

Sua sequência de check-ins está em 🔥5 dias seguidos! Não quebre agora! 💪
```

### Exemplo de Check-in Consolidado (20h)
```
Boa noite, Maria! 🌙 Hora do seu check-in diário:

1️⃣ Quanta água você bebeu hoje?
   A) Menos de 1L  B) 1-2L  C) Mais de 2L

Responda com a letra!
```

### Onboarding WhatsApp

1. **Welcome:** "💎 Plano Premium. Dicas personalizadas + Check-in 20h + IA 24h."
2. **Preferences:** "Quando prefere receber suas mensagens? A) Manhã B) Tarde C) Noite"
3. **Complete:** "Amanhã às [Xh] dica personalizada + 20h check-in consolidado!"

### Custo Operacional
- **Twilio:** ~2 msgs/dia (dica + check-in) + respostas = ~**R$ 2,15/mês**
- **Gemini:** ~50k tokens/mês = ~**R$ 0,12/mês**
- **Total:** ~**R$ 2,50/mês** por paciente

### Gatilho de Conversão → VIP
- Após 30 dias de uso contínuo (streak)
- Pacientes que enviam >20 msgs/dia (atingem rate limit frequentemente)
- Mensagem: "Você está aproveitando muito o Premium! Conheça o VIP para acesso ilimitado."

---

## 🥇 PLANO VIP: "O Concierge"

### Filosofia
> "Eu cuido de absolutamente tudo."

Para quem não quer pensar, apenas ser cuidado. **Remove todas as fricções**.
Exclusividade e paz mental total.

### Interações

| Tipo | Descrição |
|------|-----------|
| 💬 Chat IA | **Ilimitado** — sem rate limit |
| ⭐ Escalação | **Prioritária** — alertas monitorados por humanos com resposta rápida |
| 🎯 Protocolos | **Elite** — Bio-individualizados, ajustados com a equipe |
| 🎮 Gamificação | **Completa** — Com recompensas exclusivas VIP |
| 📊 Relatórios | Análise detalhada de evolução e tendências |

### Regras de Conversa

- **Chat IA:** Ilimitado (sem rate limit)
- **Classificação de intenção:** Sim, com prioridade de processamento
- **Escalação:** PRIORITÁRIA — alertas marcados como urgentes para a equipe
- **Protocolos:** Elite e bio-individualizados (personalizados pela equipe)

### Onboarding WhatsApp

1. **Welcome:** "⭐ Plano VIP. Acesso total: IA ilimitada + Escalação prioritária + Protocolos elite."
2. **Preferences:** "Quando prefere receber suas mensagens?"
3. **Complete:** "VIP ativo com acesso total. Você é nossa prioridade. 👑"

### Custo Operacional
- **Twilio:** ~5+ msgs/dia = ~**R$ 3,60/mês**
- **Gemini:** ~150k tokens/mês = ~**R$ 0,36/mês**
- **Total:** ~**R$ 5,00/mês** por paciente

---

## Resumo Comparativo

| Feature | 🥉 Freemium | 🥈 Premium | 🥇 VIP |
|---------|-------------|------------|---------|
| **Preço sugerido** | R$ 0 | R$ 29,90/mês | R$ 79,90/mês |
| Dica diária (8h) | ✅ Genérica | ✅ Personalizada | ✅ Personalizada |
| Check-in consolidado (20h) | ❌ | ✅ | ✅ |
| Chat com IA | ❌ (upsell) | ✅ 30 msgs/dia | ✅ Ilimitado |
| Protocolos | ❌ | ✅ Personalizados | ✅ Elite |
| Gamificação | ❌ | ✅ Completa | ✅ Completa + Exclusiva |
| Escalação humana | ❌ | Normal | ⭐ Prioritária |
| Escolha de horário | ❌ (fixo 8h) | ✅ | ✅ |
| **Custo operacional** | ~R$ 0,24/mês | ~R$ 2,50/mês | ~R$ 5,00/mês |
| **Margem bruta** | N/A | ~92% | ~94% |

---

## Implementação Técnica

### Arquivos relevantes

| Arquivo | Função no escalonamento |
|---------|------------------------|
| `src/ai/onboarding.ts` | Mensagens de onboarding diferenciadas por plano |
| `src/ai/handle-patient-reply.ts` | Rate limiting + upsell para freemium |
| `src/cron/send-freemium-tips.ts` | Dica diária genérica (8h) para Freemium |
| `src/cron/send-daily-checkins.ts` | Check-in diário para Premium/VIP |
| `src/cron/send-protocol-messages.ts` | Mensagens de protocolo (Premium/VIP) |
| `src/lib/types.ts` | `Subscription.plan: 'freemium' \| 'premium' \| 'vip'` |
| `src/ai/flows/generate-chatbot-reply.ts` | IA conversacional (Premium/VIP only) |

### Rate Limits por Plano

```typescript
// Em handle-patient-reply.ts
const RATE_LIMITS = {
  freemium: 5,   // msgs/dia (apenas para upsell, não para IA)
  premium: 30,   // msgs/dia com IA
  vip: Infinity  // sem limite
};
```
