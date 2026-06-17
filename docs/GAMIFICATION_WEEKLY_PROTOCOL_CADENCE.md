# Cadencia semanal de gamificacao dos protocolos

Documento criado para registrar a mudanca de estrategia feita na gamificacao dos protocolos do Cuidar.me.

## Objetivo

Reduzir o volume de mensagens para evitar fadiga do paciente, mantendo:

- coleta semanal de peso;
- estimulo comportamental;
- educacao em saude;
- gamificacao coerente com a Estrela do Cuidado;
- diferenca clara entre Fundamentos, Evolucao e Performance;
- premios alcancaveis, sem transformar o cuidado em pressao diaria.

## Decisao de produto

O protocolo deixou de operar como uma sequencia de varias mensagens diarias de gamificacao e passou a operar em uma cadencia semanal consolidada.

Padrao por semana:

1. Check-in semanal: coleta peso e percepcao da semana.
2. Conteudo educativo curto: reforco especifico do protocolo.
3. Resumo semanal: consolida score, Health Coins, peso e mensagem de continuidade.

Em um protocolo de 90 dias, isso gera ate 39 mensagens por paciente, em vez de aproximadamente 168 a 180 mensagens.

## Fluxo semanal

| Momento | Papel | Horario BRT | O que faz |
|---|---|---:|---|
| Inicio da semana | `weekly_checkin` | 07:00 | Pede peso e classificacao A/B/C da semana |
| Meio da semana | `education` | 10:00 | Envia uma dica curta, diferente por protocolo |
| Fim da semana | `weekly_summary` | 18:00 | Resume progresso real da semana |

O fallback legado ainda existe, mas so e ativado com:

```env
PROTOCOL_CADENCE=legacy_daily
```

Sem essa variavel, o padrao e a cadencia semanal.

## Formato do check-in

Mensagem enviada ao paciente:

```text
Peso: 84,7
Semana: A, B ou C
```

Significado das respostas:

- `A`: semana consistente.
- `B`: oscilou, mas manteve parte do plano.
- `C`: semana dificil, foco em retomada.

## Pontuacao semanal

O score semanal e previsivel e limitado.

| Resposta | Score | Intencao |
|---|---:|---|
| A | 100 | Reforcar consistencia |
| B | 90 | Valorizar manutencao parcial |
| C | 80 | Incentivar retomada sem punicao |

Regras importantes:

- nao ha multiplicador de streak no check-in semanal;
- nao ha bonus explosivo por level-up neste fluxo;
- se o paciente responder a mesma semana de novo, o sistema nao duplica pontos;
- se o score novo for maior que o anterior, so entra a diferenca positiva.

## Estrela do Cuidado

A gamificacao agora alimenta a Estrela do Cuidado. Cada check-in semanal atualiza os cinco pilares:

- Alimentacao;
- Movimento;
- Hidratacao;
- Disciplina;
- Bem-estar.

Cada protocolo tem uma rotacao propria de foco.

### Fundamentos

Foco clinico: base, aderencia simples, retomada e seguranca.

Rotacao principal:

- Disciplina + Hidratacao;
- Alimentacao + Bem-estar;
- Movimento + Disciplina;
- Hidratacao + Alimentacao;
- Bem-estar + Disciplina.

### Evolucao

Foco clinico: ajuste de padrao, consistencia e leitura da rotina.

Rotacao principal:

- Disciplina + Alimentacao;
- Movimento + Hidratacao;
- Bem-estar + Alimentacao;
- Disciplina + Movimento;
- Hidratacao + Bem-estar.

### Performance

Foco clinico: execucao, recuperacao, dados e calibragem fina.

Rotacao principal:

- Disciplina + Movimento;
- Alimentacao + Movimento;
- Bem-estar + Disciplina;
- Hidratacao + Movimento;
- Bem-estar + Alimentacao.

## Badges

Os badges foram diferenciados por protocolo, com marcos alcancaveis:

- 1 semana registrada;
- 4 semanas registradas;
- 8 semanas registradas;
- 12 semanas registradas.

Exemplos:

- Fundamentos: `fundamentos_first_checkin`, `fundamentos_consistency_4`, `fundamentos_consistency_8`, `fundamentos_consistency_12`.
- Evolucao: `evolucao_first_checkin`, `evolucao_consistency_4`, `evolucao_consistency_8`, `evolucao_consistency_12`.
- Performance: `performance_first_checkin`, `performance_consistency_4`, `performance_consistency_8`, `performance_consistency_12`.

## Loja e premios

A economia foi recalibrada para ficar coerente com ate 100 Health Coins por semana.

| Premio | Custo anterior | Custo atual |
|---|---:|---:|
| Protecao de semana | 100 | 200 |
| E-book de receitas | 1.500 | 900 |
| Badge Desbravador | 1.500 | 1.200 |
| Masterclass fim de semana | 4.000 | 2.500 |
| Cupom parceiros 15% | 4.000 | 3.500 |
| Camiseta exclusiva | 8.000 | 6.000 |
| Consultoria VIP 15min | 8.000 | 6.500 |
| Livro Habitos Atomicos | 15.000 | 10.000 |
| Desconto anual 50% | 15.000 | 12.000 |

Racional:

- primeiro premio real deve aparecer no horizonte de um protocolo;
- recompensas de maior custo continuam aspiracionais;
- premio de consulta continua protegido por custo alto;
- o paciente e recompensado por continuidade, nao por excesso de mensagens.

## Onde esta no codigo

### Geracao da cadencia semanal

Arquivo:

```text
src/lib/data/weekly-protocol-messages.ts
```

Responsabilidades:

- define perfis semanais por protocolo;
- define textos educativos;
- define rotacao da Estrela do Cuidado;
- gera mensagens semanais;
- calcula score A/B/C;
- monta resumo semanal;
- monta progresso dos pilares.

Principais funcoes:

- `getWeeklyProtocolMessages`;
- `calculateWeeklyScore`;
- `buildWeeklySummaryMessage`;
- `getWeeklyStarFocus`;
- `buildWeeklyStarProgress`.

### Exportacao da nova API de dados

Arquivo:

```text
src/lib/data/index.ts
```

Responsabilidade:

- exporta as novas funcoes semanais para uso em cron e handlers.

### Agendamento das mensagens

Arquivo:

```text
src/cron/send-protocol-messages.ts
```

Responsabilidades:

- agenda a cadencia semanal por padrao;
- salva metadata com `protocolId`, `protocolWeek` e `weeklyMessageRole`;
- define horarios por papel da mensagem;
- preserva fallback legado com `PROTOCOL_CADENCE=legacy_daily`;
- ajusta o teste manual de agendamento para contar mensagens semanais.

### Envio e resumo dinamico

Arquivo:

```text
src/ai/handle-patient-reply.ts
```

Responsabilidades:

- amplia janela do check-in semanal para 72h;
- gera resumo semanal no momento do envio;
- usa `weeklyProtocolScores` para preencher score, peso e Health Coins;
- evita que mensagens educativas e resumos abram contexto de check-in;
- mantem contexto de resposta apenas para `weekly_checkin`.

### Processamento da resposta semanal

Arquivo:

```text
src/ai/handlers/checkin-response-handler.ts
```

Responsabilidades:

- identifica `Check-in Semanal`;
- valida peso e A/B/C;
- registra peso em `health_metrics`;
- calcula score semanal;
- evita duplicacao de pontos na mesma semana;
- salva historico em `gamification.weeklyProtocolScores`;
- atualiza `gamification.weeklyProgress` para a Estrela do Cuidado;
- adiciona badges por protocolo;
- limpa `last_checkin_type` e `last_checkin_at`.

### Tipos

Arquivo:

```text
src/lib/types.ts
```

Responsabilidades:

- documenta `weeklyProtocolScores`;
- adiciona metadata semanal em mensagens agendadas.

### Transformacao Supabase -> UI

Arquivo:

```text
src/lib/supabase-transforms.ts
```

Responsabilidade:

- preserva `gamification.weeklyProgress` vindo do banco, para a Estrela do Cuidado aparecer corretamente no portal.

### Badges

Arquivo:

```text
src/lib/badge-catalog.ts
```

Responsabilidade:

- cadastra badges semanais gerais e badges especificos por protocolo.

### Loja

Arquivo:

```text
src/lib/points-store.ts
```

Responsabilidade:

- recalibra custos dos premios para a nova economia semanal.

### Tela "Como funciona"

Arquivo:

```text
src/app/portal/how-it-works/page.tsx
```

Responsabilidades:

- atualiza custos destacados da loja;
- troca explicacao de metas/streaks por Estrela do Cuidado semanal;
- atualiza protecao de semana.

### Testes

Arquivos:

```text
tests/unit/weekly-protocol-messages.test.ts
tests/unit/points-store.test.ts
tests/unit/actions/store.test.ts
tests/unit/supabase-transforms.test.ts
tests/unit/badge-system.test.ts
```

Responsabilidades:

- valida ate 39 mensagens em protocolo de 90 dias;
- valida score A/B/C;
- valida foco diferente da Estrela por protocolo;
- atualiza expectativas de custo da loja;
- confirma que o transformador preserva dados de gamificacao.

## Validacao executada

Comandos executados:

```bash
npx tsc --noEmit
npx vitest run tests/unit/weekly-protocol-messages.test.ts tests/unit/points-store.test.ts tests/unit/actions/store.test.ts tests/unit/supabase-transforms.test.ts tests/unit/badge-system.test.ts
```

Resultado:

- TypeScript sem erros.
- 5 arquivos de teste passaram.
- 34 testes passaram.

## Commit relacionado

```text
139b2a4 Rework protocol gamification cadence
```

## Observacoes operacionais

- Novos agendamentos passam a usar a cadencia semanal automaticamente.
- Mensagens ja agendadas antes da mudanca podem continuar na fila antiga se nao forem canceladas/recriadas.
- Para aplicar a nova cadencia a pacientes ja ativos com fila pendente antiga, cancelar mensagens pendentes de `source='protocol'` e reexecutar o agendador.
- Nao remover o fallback legado ate a nova cadencia ser observada em producao por pelo menos um ciclo semanal.
