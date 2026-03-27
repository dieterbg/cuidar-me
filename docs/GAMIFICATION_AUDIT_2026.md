# Auditoria Completa do Sistema de Gamificacao - Cuidar.me

> **Data:** 27/03/2026
> **Tipo:** Auditoria tecnica + economia de pontos + avaliacao critica
> **Escopo:** Todos os mecanismos de gamificacao, loja, badges, streaks, niveis

---

## 1. Economia de Pontos — Todas as Fontes

### 1.1 Check-ins de Protocolo (via WhatsApp)

| Check-in | Nota A | Nota B | Nota C | Perspectiva |
|----------|--------|--------|--------|-------------|
| Almoco | 20 | 15 | 10 | Alimentacao |
| Jantar | 20 | 15 | 10 | Alimentacao |
| Hidratacao | 15 | 10 | 5 | Hidratacao |
| Bem-Estar | 15 | 10 | 5 | BemEstar |
| Atividade Fisica | 40 | 0 | — | Movimento |
| Peso Semanal | 50 | — | — | Disciplina |
| Planejamento Semanal | 30 | 0 | — | Disciplina |

### 1.2 Acoes Diretas (Portal/App)

| Acao | Pontos |
|------|--------|
| Completar perfil (onboarding) | 150 |
| Assistir video de boas-vindas | 30 |
| Assistir video educacional | 20 |
| Assistir video de nutricao | 20 |
| Participar da comunidade | 25 |

### 1.3 Bonus de Meta Semanal

Ao completar 5 check-ins numa perspectiva na semana: **+50 pontos bonus**

### 1.4 Bonus de Streak

| Marco | Bonus |
|-------|-------|
| 7 dias | 100 pts |
| 14 dias | 200 pts |
| 30 dias | 500 pts |
| 60 dias | 1.000 pts |
| 90 dias | 2.000 pts |

### 1.5 Anti-Cheat

- Cooldown de 4 horas entre acoes na mesma perspectiva
- Limite diario: 5 acoes por perspectiva
- Tracking via `lastActionLogs` e `dailyActionCounts`

---

## 2. Cronograma de Gamificacao Semanal (13 semanas)

O protocolo agenda check-ins obrigatorios nesta cadencia:

| Dia | Check-ins Agendados | Pts (tudo A) |
|-----|---------------------|--------------|
| Segunda | Peso (50) + Planejamento (30) + Hidratacao (15) | 95 |
| Terca | Almoco (20) + Hidratacao (15) | 35 |
| Quarta | Atividade (40) + Hidratacao (15) | 55 |
| Quinta | Bem-Estar (15) + Hidratacao (15) | 30 |
| Sexta | Jantar (20) + Hidratacao (15) | 35 |
| Sabado | Atividade (40) + Hidratacao (15) | 55 |
| Domingo | Bem-Estar (15) + Hidratacao (15) | 30 |
| **Total/semana** | | **335** |

**Limite operacional:** Max 3 mensagens/dia (gamificacao tem prioridade sobre conteudo)

---

## 3. Pontuacao Maxima Possivel

### 3.1 Calculo por Fonte (90 dias / 13 semanas)

| Fonte | Calculo | Total |
|-------|---------|-------|
| Check-ins agendados (tudo A) | 335 x 13 | 4.355 |
| Bonus streak (90 dias perfeitos) | 100+200+500+1000+2000 | 3.800 |
| Meta semanal Hidratacao (unica alcancavel) | 50 x 13 | 650 |
| Onboarding + videos | ~150+30+20 | ~200 |
| **Subtotal (so protocolo agendado)** | | **~9.005** |

### 3.2 Com Acoes Manuais Extras

| Fonte extra | Estimativa |
|-------------|-----------|
| Metas semanais das 4 perspectivas restantes | 4 x 50 x 13 = 2.600 |
| Videos educacionais (~10) | ~200 |
| Comunidade (~20 interacoes) | ~500 |
| **Maximo teorico com esforco extra** | **~12.300** |

### 3.3 Maximo Absoluto Teorico

Incluindo logging manual agressivo em todas as perspectivas ate o limite diario:
**~15.000 pontos** (requer dedicacao extrema por 90 dias)

### 3.4 Onde Cada Cenario Chega

| Cenario | Pontos | Nivel | Tier |
|---------|--------|-------|------|
| Protocolo perfeito (so agendado) | ~9.005 | 12 | Ouro II |
| Com logging manual moderado | ~12.000 | 14 | Ouro IV |
| Maximo absoluto teorico | ~15.000 | 16 | Diamante I |
| Paciente medio realista | ~4.000-6.000 | 6-8 | Prata I-III |

---

## 4. Sistema de Niveis (20 niveis, 4 tiers)

### Bronze (Niveis 1-5)

| Nivel | Pontos | Nome |
|-------|--------|------|
| 1 | 0 | Bronze I |
| 2 | 300 | Bronze II |
| 3 | 700 | Bronze III |
| 4 | 1.500 | Bronze IV |
| 5 | 2.500 | Bronze V |

### Prata (Niveis 6-10)

| Nivel | Pontos | Nome |
|-------|--------|------|
| 6 | 4.000 | Prata I |
| 7 | 4.800 | Prata II |
| 8 | 5.600 | Prata III |
| 9 | 6.400 | Prata IV |
| 10 | 7.200 | Prata V |

### Ouro (Niveis 11-15)

| Nivel | Pontos | Nome |
|-------|--------|------|
| 11 | 8.000 | Ouro I |
| 12 | 9.000 | Ouro II |
| 13 | 10.000 | Ouro III |
| 14 | 11.500 | Ouro IV |
| 15 | 13.000 | Ouro V |

### Diamante (Niveis 16-20)

| Nivel | Pontos | Nome |
|-------|--------|------|
| 16 | 15.000 | Diamante I |
| 17 | 17.000 | Diamante II |
| 18 | 19.500 | Diamante III |
| 19 | 22.000 | Diamante IV |
| 20 | 25.000 | Diamante V |

---

## 5. Catalogo de Badges (20 badges)

### Streak (5)

| ID | Nome | Condicao | Raridade |
|----|------|----------|----------|
| streak_7 | Fogo no Parquinho | 7 dias consecutivos | Comum |
| streak_14 | Chama Constante | 14 dias consecutivos | Comum |
| streak_30 | Chama Acesa | 30 dias consecutivos | Raro |
| streak_60 | Inferno Controlado | 60 dias consecutivos | Epico |
| streak_90 | Inferno Vivo | 90 dias consecutivos | Lendario |

### Perspectivas (5)

| ID | Nome | Condicao | Raridade |
|----|------|----------|----------|
| hydration_master | Hidratado Profissional | 30 check-ins hidratacao | Comum |
| nutrition_expert | Nutri Expert | 50 refeicoes nota A | Raro |
| athlete | Atleta | 20 check-ins atividade | Raro |
| zen_master | Zen Master | 20 check-ins bem-estar | Raro |
| disciplined | Disciplinado | 10 pesagens semanais | Comum |

### Pontos (4)

| ID | Nome | Condicao | Raridade |
|----|------|----------|----------|
| points_500 | Iniciante Dedicado | 500 pontos totais | Comum |
| points_1000 | Praticante Comprometido | 1.000 pontos totais | Comum |
| points_2000 | Veterano Comprometido | 2.000 pontos totais | Raro |
| points_5000 | Mestre dos Pontos | 5.000 pontos totais | Epico |

### Comunidade (2)

| ID | Nome | Condicao | Raridade |
|----|------|----------|----------|
| community_10_comments | Conversador | 10 comentarios | Comum |
| community_50_reactions | Apoiador | 50 reacoes | Raro |

### Especiais (4)

| ID | Nome | Condicao | Raridade |
|----|------|----------|----------|
| perfectionist | Perfeccionista | 4 semanas perfeitas consecutivas | Epico |
| weight_goal | Campeao | Atingiu meta de peso | Lendario |
| level_10 | Praticante Avancado | Nivel 10 | Raro |
| level_20 | Lenda Viva | Nivel 20 (maximo) | Lendario |

---

## 6. Loja de Pontos (9 itens)

### Comum

| Item | Custo | Tipo | Categoria |
|------|-------|------|-----------|
| Protecao de Streak | 300 | Instantaneo | Streak |

### Bronze (1.500 pts)

| Item | Custo | Tipo | Categoria |
|------|-------|------|-----------|
| E-book: 30 Receitas Rapidas | 1.500 | Voucher | Conteudo |
| Badge Desbravador | 1.500 | Instantaneo | Conteudo |

### Prata (4.000 pts)

| Item | Custo | Tipo | Categoria |
|------|-------|------|-----------|
| Masterclass: Fim de Semana | 4.000 | Voucher | Conteudo |
| Cupom de Parceiros (15%) | 4.000 | Voucher | Desconto |

### Ouro (8.000 pts)

| Item | Custo | Tipo | Categoria |
|------|-------|------|-----------|
| Camiseta Exclusiva Atleta | 8.000 | Voucher | Fisico |
| Consultoria VIP (15min) | 8.000 | Voucher | Consulta |

### Diamante (15.000 pts)

| Item | Custo | Tipo | Categoria |
|------|-------|------|-----------|
| Livro: Habitos Atomicos | 15.000 | Voucher | Fisico |
| 50% de Desconto (Anual) | 15.000 | Voucher | Upgrade |

---

## 7. Sistema de Streaks

- **Streak atual:** dias consecutivos com atividade
- **Maior streak:** recorde pessoal
- **Freeze:** protege 1 dia perdido (max 2 ativos, reseta dia 1 de cada mes)
- **Custo do freeze:** 300 pts
- **Quebra de streak:** se >1 dia sem atividade e sem freeze, reseta para 1

---

## 8. Problemas Criticos Identificados

### 8.1 Economia Estrangulada
Paciente perfeito por 90 dias chega ao Ouro (nivel 12). Itens Diamante (15.000 pts) sao matematicamente quase impossiveis num unico ciclo. Frustra ao inves de motivar.

### 8.2 Metas Semanais Inalcancaveis (4 de 5 perspectivas)
Meta de 5 check-ins/semana quando o sistema so agenda 2 para Alimentacao, Movimento, BemEstar e Disciplina. Seria necessario 12 acoes manuais extras por semana. Taxa de conclusao esperada: < 5%.

### 8.3 Streak Freeze Caro Demais
300 pts para 1 dia de protecao. Paciente ganha ~50-100 pts/dia. Gasta 3-6 dias de progresso para proteger 1 dia. ROI negativo.

### 8.4 Sem Recompensa por Subir de Nivel
Level-up e o momento dopaminico principal em qualquer sistema de gamificacao. Aqui e puramente cosmetico — zero pontos bonus, zero desbloqueios, zero fanfarra.

### 8.5 Badges Nao Dao Pontos
20 badges que nao impactam nada na economia. Falta o loop: acao > badge > pontos > loja > motivacao > acao.

### 8.6 Loja Muito Pequena (9 itens)
Para 20 niveis e 4 tiers, 9 itens e muito pouco. Apos comprar streak freeze e e-book, nao ha motivacao para acumular pontos nos tiers baixos.

### 8.7 Sem Progressao de Ganho
Nivel 1 e nivel 19 ganham os mesmos pontos por check-in. Curva de pontos linear vs niveis exponenciais cria "grind wall" nos niveis superiores.

---

## 9. O Que Esta Bom

- Estrutura de 5 perspectivas cobre saude integral
- Sistema A/B/C recompensa mesmo quem nao foi perfeito (10 pts por "fugi do plano")
- Streaks de longo prazo (7>14>30>60>90) com bonus crescentes
- Anti-cheat com cooldown de 4h previne abuso
- Itens fisicos reais na loja (camiseta, livro) tangibilizam a recompensa
- Voucher system com codigos copiáveis funciona bem

---

## 10. Recomendacoes Priorizadas

### Quick Wins (pouco codigo)

| # | Mudanca | Impacto |
|---|---------|---------|
| 1 | Reduzir meta semanal de 5 para 3 | Torna 80%+ das metas alcancaveis |
| 2 | Dar pontos por badge (50/100/200/500 por raridade) | Fecha o loop de reforco |
| 3 | Dar pontos por level-up (100 x nivel) | Cria momento dopaminico |
| 4 | Baratear streak freeze para 100 pts | Torna a compra racional |
| 5 | Multiplicador por streak (1.5x apos 7d, 2x apos 30d) | Recompensa consistencia |

### Medio Prazo

| # | Mudanca | Impacto |
|---|---------|---------|
| 6 | Adicionar 5+ itens por tier na loja | Mantem motivacao de compra |
| 7 | Daily bonus (10 pts por qualquer interacao) | Incentiva retorno diario |
| 8 | Missoes semanais especiais | Variedade e surpresa |
| 9 | Multiplicador por nivel (1% por nivel) | Resolve grind wall |

---

## 11. Arquivos Relevantes no Codigo

| Arquivo | Conteudo |
|---------|----------|
| `src/lib/data/gamification-config.ts` | Pontos por acao, metas semanais |
| `src/lib/data/gamification-steps.ts` | Cronograma de 13 semanas |
| `src/lib/points-store.ts` | Catalogo da loja |
| `src/lib/level-system.ts` | 20 niveis e thresholds |
| `src/lib/badge-catalog.ts` | 20 badges e condicoes |
| `src/lib/badge-unlock-logic.ts` | Logica de desbloqueio |
| `src/ai/actions/gamification.ts` | registerQuickAction, rate limiting |
| `src/ai/actions/streak.ts` | Streak e freeze |
| `src/ai/actions/store.ts` | Compras e transacoes |
| `src/ai/actions/badges.ts` | Concessao de badges |
| `src/ai/handlers/gamification-handler.ts` | Processamento de protocolo |
| `src/ai/protocol-response-processor.ts` | Parser A/B/C e calculo de pontos |
| `src/components/points-store.tsx` | UI da loja |
