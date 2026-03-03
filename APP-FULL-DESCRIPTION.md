# 📘 Cuidar.me - Descrição Completa do Sistema

Este documento descreve minuciosamente o funcionamento do aplicativo **Cuidar.me**, uma plataforma de monitoramento de saúde e bem-estar via WhatsApp, impulsionada por Inteligência Artificial e Gamificação.

---

## 1. Visão Geral
O **Cuidar.me** é um "Personal Health Companion" que vive no WhatsApp do paciente. Ele não é apenas um chatbot passivo; é um sistema proativo que acompanha a rotina do usuário, envia lembretes, coleta dados de saúde, oferece suporte emocional e recompensa bons comportamentos com pontos (Gamificação).

---

## 2. Planos e Escalonamento de Valor

O Cuidar.me opera com **3 planos** baseados na estratégia PLG (Product Led Growth):

| Feature | 🥉 Freemium | 🥈 Premium | 🥇 VIP |
|---------|-------------|------------|---------|
| **Dica diária (8h)** | ✅ Genérica | ✅ Personalizada | ✅ Personalizada |
| **Check-in consolidado (20h)** | ❌ | ✅ | ✅ |
| **Chat com IA** | ❌ (upsell) | ✅ 30 msgs/dia | ✅ Ilimitado |
| **Protocolos** | ❌ | ✅ Personalizados | ✅ Elite |
| **Gamificação** | ❌ | ✅ Completa | ✅ + Exclusiva |
| **Escalação humana** | ❌ | Normal | ⭐ Prioritária |

> **Estratégia detalhada:** Veja [PRODUCT-TIERS.md](./PRODUCT-TIERS.md)

---

## 3. Fluxos Principais

### 🚀 3.1. Onboarding (Boas-Vindas)
O primeiro contato do paciente com o sistema, **diferenciado por plano**.
*   **Gatilho:** Ocorre quando o onboarding é iniciado pelo painel admin para um paciente cadastrado.
*   **Canal:** WhatsApp.
*   **Fluxo por plano:**
    *   **Freemium:** Welcome → "Sim" → Complete (pula preferências, fixo 8h manhã)
    *   **Premium/VIP:** Welcome → "Sim" → Preferências (Manhã/Tarde/Noite) → Complete
*   **Ao final:** Ativa o paciente (status `active`) e define `preferred_message_time`.

### 📅 3.2. Dica Diária (Freemium)
Todos os pacientes Freemium recebem uma dica de saúde genérica às 8h da manhã.
*   **Frequência:** Diária (Cron Job às 8h).
*   **Conteúdo:** Banco de 7 dicas rotativas sobre hidratação, alimentação, exercício, sono, etc.
*   **Conversa:** Desabilitada. Qualquer resposta gera upsell para Premium.

### 📅 3.3. Check-ins Diários (Premium/VIP)
O sistema monitora o paciente com check-ins consolidados.
*   **Frequência:** Diária (Cron Job roda de hora em hora).
*   **Conteúdo:**
    *   **Hidratação:** "Bebeu água hoje?" (Meta: 2.5L).
    *   **Alimentação:** "Seguiu o plano no Café/Almoço/Jantar?" (A=100%, B=Adaptei, C=Fugi).
    *   **Atividade Física:** "Se movimentou hoje?".
    *   **Bem-Estar:** "Como está se sentindo?" (Escala 1-5 emojis).
*   **Inteligência:** O sistema não repete perguntas se o usuário já respondeu espontaneamente.

### 📋 3.4. Protocolos de Saúde (Premium/VIP)
Pacientes pagos seguem um "Protocolo" (ex: "Jejum Intermitente", "Reeducação Alimentar") que dura N dias.
*   **Funcionamento:** Cada dia do protocolo tem mensagens específicas agendadas.
*   **Tipos de Mensagem:**
    *   **Conteúdo Educativo:** Dicas de saúde, receitas, motivação.
    *   **Tarefas Gamificadas:** Desafios específicos (ex: "Poste uma foto do seu prato", "Faça 10min de caminhada").
*   **Progressão:** O sistema controla em qual dia (Day 1, Day 2...) o paciente está e avança automaticamente.

---

## 4. Inteligência Artificial (O "Cérebro")

O sistema utiliza um classificador de intenção avançado para entender o que o paciente diz.
**Nota:** A IA conversacional é disponível apenas para planos **Premium** e **VIP**.

### 🧠 Classificação de Mensagens
Toda mensagem recebida passa por um filtro que decide:
1.  **🚨 Emergência:** Palavras como "dor", "sangramento", "desmaio".
    *   **Ação:** Escala imediata para humano, marca paciente como `needs_attention`, envia alerta.
2.  **✅ Resposta de Check-in:** "Bebi 2 litros", "Comi salada".
    *   **Ação:** Registra os dados no banco, calcula pontos, responde com feedback positivo.
3.  **💬 Social/Dúvida:** "Bom dia", "Pode comer chocolate?".
    *   **Ação (Premium/VIP):** A IA Conversacional (Gemini) gera uma resposta empática e contextualizada.
    *   **Ação (Freemium):** Envia upsell para plano Premium.

---

## 5. Gamificação & Recompensas (Premium/VIP)

Para engajar o usuário, tudo vale pontos ("Health Coins").

### 🏆 Sistema de Pontos
*   **Check-in Completo:** +50 pontos.
*   **Hidratação Correta:** +15 pontos.
*   **Alimentação 100% (A):** +20 pontos.
*   **Atividade Física:** +30 pontos + 1 ponto por minuto.
*   **Pesagem Semanal:** +50 pontos.

### 🛍️ Loja (Store)
*   Os pacientes acumulam pontos que podem ser trocados por recompensas na "Loja" do portal.
*   Exemplos: Vouchers de desconto, e-books, consultas extras.

---

## 6. Segurança & Resiliência

O sistema foi desenhado para não falhar e proteger o paciente.

*   **Lembretes de Esquecimento:** Se o paciente não responde ao check-in, o sistema envia lembrete (Recuperação de Check-in).
*   **Rate Limiting:** Proteção contra abuso por plano (Freemium: 5/dia, Premium: 30/dia, VIP: ilimitado).
*   **Filas de Mensagem:** Se o WhatsApp cair, as mensagens ficam numa fila (`scheduled_messages`) e são tentadas novamente.
*   **Logs Detalhados:** Tudo é registrado para auditoria.

---

## 7. Tecnologia (Bastidores)

*   **Banco de Dados:** Supabase (PostgreSQL) - Armazena tudo (pacientes, mensagens, histórico).
*   **Backend:** Next.js 14 (Server Actions & API Routes).
*   **IA:** Google Gemini via Genkit (Geração de texto e classificação).
*   **Mensageria:** Twilio (API Oficial do WhatsApp).
*   **Agendamento:** Vercel Cron Jobs (Dispara as rotinas automáticas).

---

## Resumo em Uma Frase
O **Cuidar.me** é um **assistente de saúde 24/7** que usa **WhatsApp e IA** para transformar a jornada de cuidado em um **jogo engajador**, com planos Freemium (dica diária), Premium (acompanhamento ativo) e VIP (cuidado total), garantindo que o paciente nunca se sinta sozinho ou desmotivado.
