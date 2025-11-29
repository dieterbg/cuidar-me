# 📘 Cuidar.me - Descrição Completa do Sistema

Este documento descreve minuciosamente o funcionamento do aplicativo **Cuidar.me**, uma plataforma de monitoramento de saúde e bem-estar via WhatsApp, impulsionada por Inteligência Artificial e Gamificação.

---

## 1. Visão Geral
O **Cuidar.me** é um "Personal Health Companion" que vive no WhatsApp do paciente. Ele não é apenas um chatbot passivo; é um sistema proativo que acompanha a rotina do usuário, envia lembretes, coleta dados de saúde, oferece suporte emocional e recompensa bons comportamentos com pontos (Gamificação).

---

## 2. Fluxos Principais

### 🚀 2.1. Onboarding (Boas-Vindas)
O primeiro contato do paciente com o sistema.
*   **Gatilho:** Ocorre automaticamente quando um novo paciente é cadastrado no sistema com status `pending`.
*   **Canal:** WhatsApp.
*   **O que acontece:**
    1.  O sistema envia uma mensagem de boas-vindas calorosa.
    2.  Coleta dados iniciais essenciais (confirmação de nome, peso inicial, objetivos).
    3.  Explica como o sistema funciona (pontos, check-ins).
    4.  Ao final, ativa o paciente (status `active`) e inicia o **Protocolo Padrão**.

### 📅 2.2. Check-ins Diários (Rotina)
O sistema monitora o paciente em três momentos chave do dia, baseados na preferência de horário do usuário (Manhã, Tarde ou Noite).
*   **Frequência:** Diária (Cron Job roda de hora em hora para verificar preferências).
*   **Conteúdo:**
    *   **Hidratação:** "Bebeu água hoje?" (Meta: 2.5L).
    *   **Alimentação:** "Seguiu o plano no Café/Almoço/Jantar?" (A=100%, B=Adaptei, C=Fugi).
    *   **Atividade Física:** "Se movimentou hoje?".
    *   **Bem-Estar:** "Como está se sentindo?" (Escala 1-5 emojis).
*   **Inteligência:** O sistema não repete perguntas se o usuário já respondeu espontaneamente.

### 📋 2.3. Protocolos de Saúde
Além da rotina diária, o paciente segue um "Protocolo" (ex: "Jejum Intermitente", "Reeducação Alimentar") que dura N dias.
*   **Funcionamento:** Cada dia do protocolo tem mensagens específicas agendadas.
*   **Tipos de Mensagem:**
    *   **Conteúdo Educativo:** Dicas de saúde, receitas, motivação.
    *   **Tarefas Gamificadas:** Desafios específicos (ex: "Poste uma foto do seu prato", "Faça 10min de caminhada").
*   **Progressão:** O sistema controla em qual dia (Day 1, Day 2...) o paciente está e avança automaticamente se as tarefas forem cumpridas.

---

## 3. Inteligência Artificial (O "Cérebro")

O sistema utiliza um classificador de intenção avançado para entender o que o paciente diz.

### 🧠 Classificação de Mensagens
Toda mensagem recebida passa por um filtro que decide:
1.  **🚨 Emergência:** Palavras como "dor", "sangramento", "desmaio".
    *   **Ação:** Escala imediata para humano, marca paciente como `needs_attention`, envia alerta.
2.  **✅ Resposta de Check-in:** "Bebi 2 litros", "Comi salada".
    *   **Ação:** Registra os dados no banco, calcula pontos, responde com feedback positivo.
3.  **💬 Social/Dúvida:** "Bom dia", "Pode comer chocolate?".
    *   **Ação:** A IA Conversacional (Gemini) gera uma resposta empática e contextualizada, tirando dúvidas ou conversando amigavelmente.

---

## 4. Gamificação & Recompensas

Para engajar o usuário, tudo vale pontos ("Health Coins").

### 🏆 Sistema de Pontos
*   **Check-in Completo:** +50 pontos.
*   **Hidratação Correta:** +15 pontos.
*   **Alimentação 100% (A):** +20 pontos.
*   **Atividade Física:** +30 pontos + 1 ponto por minuto.
*   **Pesagem Semanal:** +50 pontos.

### 🛍️ Loja (Store)
*   Os pacientes acumulam pontos que podem ser trocados por recompensas (reais ou virtuais) na "Loja" dentro do portal do paciente.
*   Exemplos: Vouchers de desconto, e-books, consultas extras.

---

## 5. Segurança & Resiliência

O sistema foi desenhado para não falhar e proteger o paciente.

*   **Lembretes de Esquecimento:** Se o paciente não responde ao check-in matinal, o sistema envia um lembrete amigável à tarde (Recuperação de Check-in).
*   **Rate Limiting:** Proteção contra abuso da API.
*   **Filas de Mensagem:** Se o WhatsApp cair, as mensagens ficam numa fila (`scheduled_messages`) e são tentadas novamente.
*   **Logs Detalhados:** Tudo é registrado para auditoria (quem mandou, quando, o que a IA entendeu).

---

## 6. Tecnologia (Bastidores)

*   **Banco de Dados:** Supabase (PostgreSQL) - Armazena tudo (pacientes, mensagens, histórico).
*   **Backend:** Next.js (Server Actions & API Routes).
*   **IA:** Google Gemini (Geração de texto e classificação).
*   **Mensageria:** Twilio (API Oficial do WhatsApp).
*   **Agendamento:** Vercel Cron Jobs (Dispara as rotinas automáticas).

---

## Resumo em Uma Frase
O **Cuidar.me** é um **assistente de saúde 24/7** que usa **WhatsApp e IA** para transformar a jornada de cuidado em um **jogo engajador**, garantindo que o paciente nunca se sinta sozinho ou desmotivado.
