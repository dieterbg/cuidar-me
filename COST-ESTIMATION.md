# 💰 Estimativa de Custos Operacionais - Cuidar.me

Esta estimativa projeta os custos mensais para manter o app rodando, considerando as tecnologias utilizadas: **Vercel, Supabase, Twilio (WhatsApp) e Google Gemini (IA).**

---

## 1. Modelo de Custos

O custo do Cuidar.me é majoritariamente **variável**, ou seja, cresce conforme o número de pacientes ativos.

### A. Infraestrutura (Custos Fixos/Base)
Para o piloto e fases iniciais, os planos gratuitos ("Free Tiers") são suficientes.

| Serviço | Plano Recomendado | Custo Mensal | Limites (Free Tier) |
| :--- | :--- | :--- | :--- |
| **Vercel** | Hobby (Free) | **$0,00** | Suficiente para o piloto. |
| **Supabase** | Free | **$0,00** | 500MB Database (dá para milhares de pacientes). |
| **Google Cloud** | Free Tier | **$0,00** | Gemini tem cota gratuita generosa. |
| **TOTAL FIXO** | | **$0,00** | (Até escalar para plano Pro: ~$45/mês) |

---

## 2. Custos Variáveis (Por Paciente)

O maior custo será o **WhatsApp (Twilio)**.

### B. WhatsApp (Twilio) - Brasil 🇧🇷
O WhatsApp cobra por **janela de conversação de 24h**.
*   **Utility (Utilidade):** Check-ins diários, lembretes. (~$0.008 USD / conversa)
*   **Service (Serviço):** Quando o usuário inicia a conversa. (~$0.03 USD / conversa - mas as primeiras 1.000/mês são grátis).

**Cenário de Uso Típico (Por Paciente/Mês):**
*   30 Check-ins Diários (Iniciados pelo Bot = Utility)
*   4 Respostas de Dúvidas (Iniciadas pelo Usuário = Service)

**Cálculo Unitário:**
*   30 x $0.008 = $0.24
*   4 x $0.03 = $0.12
*   **Total WhatsApp:** ~$0.36 USD / paciente / mês (aprox. R$ 2,15)

### C. Inteligência Artificial (Google Gemini)
O Gemini 1.5 Flash é extremamente barato.
*   **Custo:** ~$0.35 USD por 1 milhão de tokens.
*   **Consumo:** Um paciente gera ~50k tokens/mês (muito alto).
*   **Custo:** ~$0.02 USD / paciente / mês (aprox. R$ 0,12).

---

## 3. Cenários de Custo Total (Mensal)

Considerando Dólar a R$ 6,00.

### 🟢 Cenário 1: Piloto (10 Pacientes)
*   **Infra (Vercel/Supabase):** R$ 0,00
*   **WhatsApp:** 10 x R$ 2,15 = R$ 21,50
*   **IA:** 10 x R$ 0,12 = R$ 1,20
*   **TOTAL:** **~R$ 25,00 / mês**

### 🟡 Cenário 2: Crescimento (100 Pacientes)
*   **Infra:** R$ 0,00 (Ainda no Free Tier)
*   **WhatsApp:** 100 x R$ 2,15 = R$ 215,00
*   **IA:** 100 x R$ 0,12 = R$ 12,00
*   **TOTAL:** **~R$ 230,00 / mês** (Custo por paciente: R$ 2,30)

### 🔴 Cenário 3: Escala (1.000 Pacientes)
Aqui provavelmente precisaremos migrar para planos Pro.
*   **Infra (Vercel Pro + Supabase Pro):** ~$45 USD (R$ 270,00)
*   **WhatsApp:** 1.000 x R$ 2,15 = R$ 2.150,00
*   **IA:** 1.000 x R$ 0,12 = R$ 120,00
*   **TOTAL:** **~R$ 2.540,00 / mês** (Custo por paciente: R$ 2,54)

---

## 4. Conclusão e Estratégia

1.  **Custo por Paciente:** O custo técnico direto é de aproximadamente **R$ 2,50 por paciente ativo/mês**.
2.  **Margem:** Se você cobrar R$ 29,90 (plano básico), sua margem bruta é superior a **90%**.
3.  **Otimização:** O WhatsApp é 90% do custo.
    *   *Dica:* Use mensagens de "Service" (gratuitas nas primeiras 1000) para engajar.
    *   *Dica:* Se o paciente responder ao check-in, a janela de 24h abre e você não paga pelas próximas mensagens trocadas naquele dia.

**Resumo:** O modelo é **altamente viável e escalável**. O custo inicial é irrisório.
