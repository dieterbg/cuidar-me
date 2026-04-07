# Gamificação no Cuidar-me

Este documento serve como memória e regra de negócios sobre como a plataforma Cuidar-me lida com as mensagens de Gamificação e Check-ins dos protocolos de saúde (Fundamentos, Evolução, Performance).

## 1. Grade Semanal de Disparos
Todo protocolo com gamificação ativada segue um **ciclo de 7 dias** que se repete ao longo das 13 semanas (90 ou 91 dias) de duração.

| Dia da Semana | Horário | Check-in Enviado | Formato de Resposta Esperado | Pontos Base (A / B / C) |
| :--- | :--- | :--- | :--- | :--- |
| **Segunda-feira** | 07:00 | Pesagem Semanal | **[Numérico]** Ex: "85" | 50 (Fixo) |
| **Segunda-feira** | 09:00 | Planejamento Semanal | **[Booleano]** A/B (Sim/Ainda não) | 30 / 0 |
| **Terça-feira** | 14:00 | Almoço | **[ABC]** 100% / Parcial / Fuga | 20 / 15 / 10 |
| **Terça-feira** | 20:00 | Hidratação | **[ABC]** Meta / Parcial / Pouco | 15 / 10 / 5 |
| **Quarta-feira** | 19:00 | Atividade Física | **[Booleano]** A/B (Fiz/Não fiz) | 40 / 0 |
| **Quinta-feira** | 09:00 | Bem-Estar (Sono) | **[ABC]** Ótimo / Médio / Ruim | 15 / 10 / 5 |
| **Quinta-feira** | 20:00 | Hidratação | **[ABC]** Meta / Parcial / Pouco | 15 / 10 / 5 |
| **Sexta-feira** | 20:30 | Jantar | **[ABC]** 100% / Parcial / Fuga | 20 / 15 / 10 |
| **Sábado** | 19:00 | Atividade Física | **[Booleano]** A/B (Fiz/Descanso) | 40 / 0 |
| **Sábado** | 20:00 | Hidratação | **[ABC]** Meta / Parcial / Pouco | 15 / 10 / 5 |
| **Domingo** | 21:00 | Bem-Estar (Domingo)| **[ABC]** Renovado / Médio / Ruim | 15 / 10 / 5 |

## 2. Tipos de Resposta (Mapeamento pelo LLM)

A Inteligência Artificial (AI) que processa as respostas do WhatsApp espera os seguintes padrões, baseados na pergunta feita:

1.  **Formato ABC (Escala de Adesão):**
    Usado para avaliar aderência parcial. Exemplo: Refeições, Sono e Hidratação. Onde **A** representa sucesso total, **B** um esforço mediano ou adaptação, e **C** falha no cumprimento da meta.
2.  **Formato AB (Booleano):**
    Avalia se uma tarefa pontual foi executada ou não. Exemplo: *Atividade Física* e *Planejamento Semanal*.
3.  **Formato Numérico Direto:**
    Exclusivo para a **Pesagem Semanal**, onde o paciente é instruído a não responder com letras, mas sim escrever o número do seu peso em jejum (ex: `85` ou `85.5`).

## 3. Compatibilidade entre Protocolos
Todos os protocolos (Fundamentos, Performance, etc.) utilizam a **mesma "Fábrica"** (`buildSteps` em `gamification-steps.ts`) para gerar a grade. Isso garante que as ações de um dia específico (como Atividade Física na quarta-feira) caiam exatamente no mesmo dia para todos.
*   **O que muda:** O tom da mensagem ("copy"), que varia por arrays para evitar repetição robótica nas 13 semanas.
*   **O que se mantém:** Os horários de disparo e a equivalência das letras de pontuação. Dessa forma, pacientes em protocolos diferentes com níveis de disciplina parecidos conseguirão faixas de pontos semelhantes, e pacientes regrados em qualquer protocolo atingirão o máximo de pontos possíveis (~3575/ciclo).

## Arquivos Relevantes
*   `src/lib/data/gamification-config.ts`: Define a matriz de pontuações de cada ação.
*   `src/lib/data/gamification-steps.ts`: Define as mensagens (arrays de variação) e monta o cronograma usando `buildSteps()`.
*   `src/cron/send-protocol-messages.ts`: Script cron diário que detecta qual é a mensagem do dia do paciente baseada em `day % 7` e agenda o disparo considerando o tempo e deduplicação.
