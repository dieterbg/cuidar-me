# 📊 Plano de Melhorias do Dashboard Administrativo - Cuidar.me

> **Análise de Design & Negócio** | Data: 25/11/2025  
> **Objetivo:** Transformar o dashboard de um painel operacional para um copiloto inteligente de negócio

---

## 🎯 Visão Geral

O dashboard atual está **operacionalmente sólido** (ajuda a trabalhar), mas **estrategicamente fraco** (não ajuda a tomar decisões de negócio). Este documento detalha todas as oportunidades de melhoria identificadas em cada aba.

### Princípio Norteador
**Transformar dados em inteligência acionável**

- ❌ **Atual:** "Você tem 50 pacientes ativos"
- ✅ **Ideal:** "Você tem 50 pacientes ativos. 12 deles (VIP) estão inativos há 7+ dias. **Quer enviar uma mensagem automática?**"

---

## 📈 1. VISÃO GERAL (Overview)

### ✅ Pontos Fortes
- Cards de ação imediata (Fila de Atenção, Cadastros Pendentes)
- Hierarquia visual clara com cores semânticas
- Lista de pacientes recentes com acesso rápido

### 🔴 Oportunidades Críticas

#### 1.1 Distribuição de Receita (Breakdown de Planos)
**Por que:** O painel mostra "Pacientes Ativos" mas não diferencia o valor deles.

**Implementação:**
- Gráfico de rosca (Donut Chart) mostrando proporção Freemium vs. Premium vs. VIP
- Valores em R$ de MRR (Monthly Recurring Revenue) por plano
- Indicador de crescimento mês a mês

**Valor de Negócio:** Visão imediata da saúde financeira

#### 1.2 Métricas de Engajamento (Aderência)
**Por que:** Ter protocolos é inútil se ninguém os segue.

**Implementação:**
- Card "Taxa Média de Conclusão de Tarefas" (%)
- Indicador "Aderência aos Protocolos" com tendência
- Comparação com meta (ex: "85% - Meta: 90%")

**Valor de Negócio:** Mostra se o produto está entregando valor real

#### 1.3 Tendências Temporais (Sparklines)
**Por que:** Números estáticos não contam a história completa.

**Implementação:**
- Transformar card "Pacientes Ativos" em mini-gráfico de linha
- Mostrar crescimento dos últimos 30 dias
- Indicador de variação percentual (↑ +12% vs. mês anterior)

**Valor de Negócio:** Identifica tendências de crescimento/declínio rapidamente

#### 1.4 Saúde da Comunidade
**Implementação:**
- Card "Atividade da Comunidade"
- Métricas: Novos tópicos hoje, Reações totais, Taxa de participação
- Link direto para moderação

**Valor de Negócio:** Comunidade é pilar de retenção

### 🟡 Oportunidades de Refatoração

#### 1.5 Remover/Substituir Card "Protocolos"
**Crítica:** Saber que existem "2 protocolos" cadastrados tem pouco valor operacional.

**Ação:**
- Substituir por "Pacientes em Protocolo Ativo" (quantas pessoas estão sendo tratadas agora)
- Ou remover para dar espaço a métricas financeiras

---

## 👥 2. PACIENTES (Patients List)

### ✅ Pontos Fortes
- Filtro por plano (recém-implementado)
- Abas de priorização (Atenção/Pendentes/Todos)
- Indicadores visuais de risco e status
- Busca por nome

### 🔴 Oportunidades Críticas

#### 2.1 Filtro por Nível de Risco
**Por que:** Crucial para triagem médica eficiente.

**Implementação:**
```tsx
<Select>
  <SelectItem value="all">Todos os Riscos</SelectItem>
  <SelectItem value="high">Alto Risco</SelectItem>
  <SelectItem value="medium">Risco Médio</SelectItem>
  <SelectItem value="low">Baixo Risco</SelectItem>
</Select>
```

**Valor de Negócio:** Priorização clínica baseada em dados

#### 2.2 Indicador de SLA (Tempo sem Resposta)
**Por que:** Pacientes VIP não podem ficar sem resposta por muito tempo.

**Implementação:**
- Badge visual: "Aguardando há 3 dias" (amarelo)
- Alerta vermelho após threshold (ex: 7 dias para VIP, 14 para Premium)
- Ordenação por "Mais tempo sem resposta"

**Valor de Negócio:** Previne churn de clientes pagantes

#### 2.3 Ordenação Avançada
**Implementação:**
- Dropdown de ordenação:
  - Última interação (mais recente/antiga)
  - Pontos de gamificação (maior/menor)
  - Nome (A-Z)
  - Risco (alto primeiro)

**Valor de Negócio:** Flexibilidade operacional

### 🟡 Oportunidades Importantes

#### 2.4 Exportação para CSV/Excel
**Por que:** Análises externas, relatórios para investidores.

**Implementação:**
```tsx
<Button onClick={exportToCSV}>
  <Download className="mr-2 h-4 w-4" />
  Exportar Lista
</Button>
```

**Campos exportados:** Nome, Email, Plano, Status, Risco, Última Interação, Pontos

#### 2.5 Mini-Gráfico de Tendência de Peso
**Por que:** Visualização rápida de progresso.

**Implementação:**
- Sparkline no card do paciente mostrando últimas 7 pesagens
- Indicador de variação (↓ -2.5kg)

**Valor de Negócio:** Prova visual de resultados

### 🟢 Oportunidades Desejáveis

#### 2.6 Filtros Combinados Salvos
**Implementação:**
- Salvar combinações de filtros (ex: "VIP + Alto Risco + Sem resposta 7+ dias")
- Atalhos rápidos para cenários comuns

---

## 📋 3. PROTOCOLOS (Protocols)

### ✅ Pontos Fortes
- Geração com IA (diferencial competitivo forte!)
- Visualização de etapas combinadas (protocolo + gamificação)
- Separação clara entre protocolos customizados e mensagens automáticas

### 🔴 Oportunidades Críticas

#### 3.1 Métricas de Uso
**Por que:** Precisa saber quais protocolos estão sendo usados.

**Implementação:**
- Badge no card do protocolo: "12 pacientes ativos"
- Gráfico de linha: "Adesões nos últimos 30 dias"
- Status: "Em alta" / "Pouco usado"

**Valor de Negócio:** Identifica protocolos que precisam ser promovidos ou descontinuados

#### 3.2 Taxa de Conclusão Média
**Por que:** Protocolo bom = alta taxa de conclusão.

**Implementação:**
```tsx
<div className="flex items-center gap-2">
  <Progress value={85} />
  <span>85% de conclusão média</span>
</div>
```

**Cálculo:** (Pacientes que completaram / Total que iniciaram) × 100

**Valor de Negócio:** Métrica de qualidade do protocolo

#### 3.3 Comparação de Eficácia
**Por que:** Decisões baseadas em dados.

**Implementação:**
- Tabela comparativa:
  - Protocolo A: 85% conclusão, -3.2kg média
  - Protocolo B: 72% conclusão, -2.1kg média
- Recomendação automática: "Protocolo A tem melhor performance"

**Valor de Negócio:** Otimização contínua

### 🟡 Oportunidades Importantes

#### 3.4 Duplicar Protocolo
**Por que:** Criar variações rapidamente.

**Implementação:**
```tsx
<Button onClick={() => duplicateProtocol(protocol.id)}>
  <Copy className="mr-2 h-4 w-4" />
  Duplicar
</Button>
```

#### 3.5 Editar Etapas Existentes
**Crítica:** Atualmente só permite adicionar/remover.

**Implementação:**
- Botão "Editar" em cada etapa
- Modal com campos pré-preenchidos

### 🟢 Oportunidades Desejáveis

#### 3.6 Versionamento de Protocolos
**Implementação:**
- Histórico de alterações
- Reverter para versão anterior
- Comparar versões

---

## 🎓 4. EDUCAÇÃO (Education)

### ✅ Pontos Fortes
- Filtro por pilar de gamificação
- Envio direto para pacientes
- Validação de compatibilidade de plano

### 🔴 Oportunidades Críticas

#### 4.1 Métricas de Engajamento
**Por que:** Sem métricas, não sabe se o conteúdo funciona.

**Implementação:**
- Badge no card do vídeo: "Assistido por 45 pacientes"
- Taxa de conclusão: "78% assistiram até o final"
- Tempo médio de visualização

**Valor de Negócio:** ROI do conteúdo educativo

#### 4.2 Ranking de Vídeos Populares
**Implementação:**
- Aba "Mais Assistidos"
- Ordenação por visualizações, conclusões, reações
- Filtro temporal: "Última semana", "Último mês"

**Valor de Negócio:** Identifica conteúdo de alto valor

#### 4.3 Sugestão Automática
**Por que:** Personalização aumenta engajamento.

**Implementação:**
```tsx
<Badge variant="secondary">
  <Sparkles className="h-3 w-3 mr-1" />
  Recomendado para pacientes com perfil Iniciante
</Badge>
```

**Lógica:** Machine learning baseado em histórico de visualizações

**Valor de Negócio:** Aumenta taxa de conclusão

### 🟡 Oportunidades Importantes

#### 4.4 Envio em Massa
**Implementação:**
```tsx
<Button onClick={sendToMultiple}>
  <Send className="mr-2 h-4 w-4" />
  Enviar para Todos Premium
</Button>
```

**Filtros:** Por plano, por protocolo, por pilar de interesse

#### 4.5 Upload de Vídeos Próprios
**Por que:** Não depender apenas do YouTube.

**Implementação:**
- Integração com Vimeo ou storage próprio
- Suporte para vídeos privados

### 🟢 Oportunidades Desejáveis

#### 4.6 Playlist Automática
**Implementação:**
- Criar sequências de vídeos (jornadas de aprendizado)
- Ex: "Iniciante em Alimentação" → 5 vídeos em ordem

---

## 👥 5. COMUNIDADE (Community Moderation)

### ✅ Pontos Fortes
- Filtro por pilar
- Fixar/desafixar tópicos
- Moderação (excluir)
- Indicadores de engajamento (reações, comentários)

### 🔴 Oportunidades Críticas

#### 5.1 Dashboard de Saúde da Comunidade
**Por que:** Comunidade é ouro para retenção.

**Implementação:**
```tsx
<div className="grid grid-cols-3 gap-4">
  <StatCard 
    title="Taxa de Participação"
    value="34%"
    description="Pacientes ativos que postaram esta semana"
  />
  <StatCard 
    title="Tempo Médio de Resposta"
    value="2.3h"
    description="Entre membros da comunidade"
  />
  <StatCard 
    title="Tópicos Sem Resposta"
    value="5"
    description="Precisam de atenção"
  />
</div>
```

**Valor de Negócio:** Métricas de saúde do ecossistema

#### 5.2 Filtro "Tópicos Sem Resposta"
**Por que:** Intervenção proativa previne abandono.

**Implementação:**
- Aba dedicada "Precisam de Atenção"
- Ordenação por "Mais antigo sem resposta"
- Botão "Responder Agora" (abre modal)

**Valor de Negócio:** Aumenta senso de comunidade

#### 5.3 Alertas de Conteúdo Sensível
**Por que:** Identificar pacientes em risco emocional.

**Implementação:**
- Detecção de palavras-chave: "desistir", "não aguento", "depressão"
- Badge vermelho: "Atenção Necessária"
- Notificação para equipe de saúde

**Valor de Negócio:** Cuidado preventivo, reduz churn

### 🟡 Oportunidades Importantes

#### 5.4 Responder Diretamente da Aba
**Implementação:**
- Expandir card do tópico inline
- Campo de resposta rápida
- Sem necessidade de abrir página separada

**Valor de Negócio:** Eficiência operacional

#### 5.5 Gamificação para Moderadores
**Implementação:**
- Badges: "Ajudante do Mês", "Mentor da Comunidade"
- Ranking de contribuições
- Incentivo para pacientes ajudarem outros

**Valor de Negócio:** Comunidade auto-sustentável

### 🟢 Oportunidades Desejáveis

#### 5.6 Análise de Sentimento
**Implementação:**
- IA para detectar tom (positivo/negativo/neutro)
- Gráfico de tendência de sentimento ao longo do tempo
- Alertas de queda de moral

---

## 🎯 ROADMAP DE IMPLEMENTAÇÃO

### 🔴 FASE 1 - CRÍTICO (Sprint 1-2)
**Objetivo:** Adicionar inteligência de negócio básica

1. **Overview**
   - [ ] Gráfico de distribuição de receita (Freemium/Premium/VIP)
   - [ ] Métricas de aderência aos protocolos

2. **Pacientes**
   - [ ] Filtro por nível de risco
   - [ ] Indicador de SLA (tempo sem resposta)

3. **Educação**
   - [ ] Métricas de visualização de vídeos
   - [ ] Ranking de vídeos populares

4. **Comunidade**
   - [ ] Dashboard de saúde (taxa de participação)
   - [ ] Filtro "Tópicos Sem Resposta"

**Impacto Esperado:** +40% de eficiência operacional, visibilidade financeira

---

### 🟡 FASE 2 - IMPORTANTE (Sprint 3-4)
**Objetivo:** Otimização e automação

1. **Protocolos**
   - [ ] Métricas de aderência e comparação de eficácia
   - [ ] Duplicar protocolo

2. **Pacientes**
   - [ ] Exportação CSV
   - [ ] Mini-gráficos de tendência de peso

3. **Educação**
   - [ ] Envio em massa
   - [ ] Sugestões automáticas

4. **Overview**
   - [ ] Sparklines de crescimento

**Impacto Esperado:** +25% de retenção, decisões data-driven

---

### 🟢 FASE 3 - DESEJÁVEL (Sprint 5-6)
**Objetivo:** Diferenciação competitiva

1. **Protocolos**
   - [ ] Editar etapas existentes
   - [ ] Versionamento

2. **Educação**
   - [ ] Upload de vídeos próprios
   - [ ] Playlists automáticas

3. **Comunidade**
   - [ ] Alertas de conteúdo sensível
   - [ ] Análise de sentimento

4. **Pacientes**
   - [ ] Filtros combinados salvos

**Impacto Esperado:** Produto premium, redução de churn

---

## 📊 MÉTRICAS DE SUCESSO

### KPIs para Medir Impacto das Melhorias

#### Eficiência Operacional
- **Tempo médio para responder paciente:** Reduzir de 4h para 1h
- **Taxa de uso do dashboard:** Aumentar de 60% para 90% da equipe

#### Valor de Negócio
- **MRR (Monthly Recurring Revenue):** Visibilidade em tempo real
- **Taxa de conversão Freemium → Premium:** Aumentar de 5% para 12%
- **Churn rate:** Reduzir de 8% para 4%

#### Engajamento
- **Taxa de conclusão de protocolos:** Aumentar de 65% para 85%
- **Visualizações de vídeos educativos:** +150%
- **Participação na comunidade:** Aumentar de 30% para 50%

---

## 💡 PRINCÍPIOS DE DESIGN

### 1. Ação Sugerida > Informação Passiva
- Sempre que mostrar um dado, sugerir uma ação
- Ex: "12 VIPs inativos" → Botão "Enviar Mensagem de Reengajamento"

### 2. Contexto Visual
- Usar cores semânticas consistentes
- Gráficos > Números isolados
- Tendências > Snapshots

### 3. Progressive Disclosure
- Mostrar resumo primeiro
- Detalhes sob demanda (accordions, modals)
- Evitar sobrecarga cognitiva

### 4. Mobile-First
- Todas as melhorias devem funcionar em mobile
- Priorizar cards responsivos sobre tabelas

---

## 🚀 PRÓXIMOS PASSOS

1. **Priorização com Stakeholders**
   - Validar roadmap com equipe médica
   - Ajustar prioridades baseado em feedback

2. **Prototipação**
   - Criar mockups de alta fidelidade (Figma)
   - Testar com usuários reais

3. **Implementação Iterativa**
   - Começar por Fase 1
   - Medir impacto antes de avançar

4. **Documentação**
   - Atualizar este documento conforme implementação
   - Criar guias de uso para equipe

---

## 📝 NOTAS FINAIS

Este documento é um **plano vivo**. Deve ser atualizado conforme:
- Feedback de usuários
- Mudanças no modelo de negócio
- Novas tecnologias disponíveis
- Métricas de uso real

**Lembre-se:** O objetivo não é ter o dashboard mais bonito, mas o mais **útil** para tomar decisões que impactam o negócio.

---

**Última atualização:** 25/11/2025  
**Responsável:** Equipe de Produto  
**Status:** 🟡 Aguardando Aprovação
