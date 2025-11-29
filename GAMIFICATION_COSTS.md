# 💰 Análise de Custos: Sistema de Gamificação

## 📊 Resumo Executivo

**Custo Total de Implementação:** R$ 0 (desenvolvimento interno)  
**Custo Mensal de Operação:** ~R$ 150-300 (para 100-500 usuários ativos)  
**ROI Esperado:** +35% retenção = +R$ 10.000-20.000/mês em MRR

---

## 💸 Custos de Infraestrutura

### 1. Supabase (Banco de Dados + Auth + Storage)
**Plano Atual:** Pro ($25/mês)

**Impacto da Gamificação:**
- Adiciona ~10 colunas JSON ao `patients`
- Adiciona tabela `daily_challenges` (~365 rows/ano por usuário)
- Adiciona tabela `badge_unlocks` (histórico)
- Triggers e functions SQL

**Custo Adicional:** R$ 0  
*Justificativa:* Plano Pro suporta até 500GB de storage e 50GB de bandwidth. Gamificação adiciona ~5MB por usuário.

---

### 2. Gemini API (Google AI)
**Uso Previsto:**
- Desafios diários personalizados: 1 request/usuário/dia
- Badges personalizados: 1 request/usuário/semana
- Alertas de IA no admin: 10 requests/dia

**Cálculo para 100 usuários ativos:**
```
Desafios: 100 users × 30 dias = 3.000 requests/mês
Badges: 100 users × 4 semanas = 400 requests/mês
Alertas: 10 × 30 dias = 300 requests/mês
---
Total: ~3.700 requests/mês
```

**Modelo:** Gemini 1.5 Flash (mais barato)
- Input: ~500 tokens/request
- Output: ~200 tokens/request
- Total: 700 tokens × 3.700 = 2.590.000 tokens/mês

**Custo:**
- Input: 2.590.000 × $0.075 / 1M = $0.19
- Output: 2.590.000 × $0.30 / 1M = $0.78
- **Total: ~$1/mês (R$ 5)**

**Para 500 usuários:** ~R$ 25/mês

---

### 3. Cron Jobs (Vercel Cron ou Supabase Edge Functions)
**Jobs Necessários:**
- Gerar desafios diários (06:00) - 1x/dia
- Enviar lembretes de streak (20:00) - 1x/dia
- Resetar freezes mensais (1º dia do mês) - 1x/mês

**Plataforma:** Vercel Cron (grátis até 100 invocações/dia)

**Custo Adicional:** R$ 0  
*Justificativa:* 3 invocações/dia = 90/mês, dentro do free tier.

---

### 4. Notificações Push
**Opções:**

#### Opção A: OneSignal (Recomendado)
- **Free Tier:** 10.000 notificações/mês
- **Paid:** $9/mês para 50.000 notificações

**Uso Estimado (100 usuários):**
```
Lembretes de streak: 100 × 30 = 3.000/mês
Badges desbloqueados: 100 × 2 = 200/mês
Desafios diários: 100 × 30 = 3.000/mês
Level up: 100 × 0.5 = 50/mês
---
Total: ~6.250/mês
```

**Custo:** R$ 0 (free tier)  
**Para 500 usuários:** R$ 45/mês (paid tier)

#### Opção B: Firebase Cloud Messaging (FCM)
- **Custo:** Grátis (ilimitado)
- **Desvantagem:** Requer mais setup

**Recomendação:** Começar com OneSignal free, migrar para FCM se crescer muito.

---

### 5. Armazenamento de Imagens (Badges, Avatars)
**Necessidade:**
- 20 badges × 50KB = 1MB
- Avatares de usuários: já existentes

**Custo:** R$ 0 (dentro do Supabase Storage)

---

## 📊 Resumo de Custos Mensais

| Componente | 100 Usuários | 500 Usuários | 1000 Usuários |
|------------|--------------|--------------|---------------|
| Supabase | R$ 0 | R$ 0 | R$ 0 |
| Gemini API | R$ 5 | R$ 25 | R$ 50 |
| Cron Jobs | R$ 0 | R$ 0 | R$ 0 |
| Notificações | R$ 0 | R$ 45 | R$ 90 |
| **TOTAL** | **R$ 5** | **R$ 70** | **R$ 140** |

---

## 💡 Otimizações de Custo

### 1. Cache de Desafios de IA
**Problema:** Gerar 100 desafios únicos/dia é caro.

**Solução:** Criar pool de 50 desafios pré-gerados e rotacionar.
```typescript
// Gerar 50 desafios genéricos 1x por semana
const challengePool = await generateChallengePool(50);

// Atribuir aleatoriamente aos usuários
function assignDailyChallenge(userId: string) {
  const randomChallenge = challengePool[Math.floor(Math.random() * 50)];
  return randomChallenge;
}
```

**Economia:** 90% do custo de IA (R$ 5 → R$ 0.50 para 100 usuários)

---

### 2. Notificações Inteligentes
**Problema:** Enviar notificação para todos os usuários é desperdício.

**Solução:** Enviar apenas para quem tem alta probabilidade de engajar.
```typescript
// Enviar apenas se:
// 1. Usuário tem streak > 3 dias (investimento emocional)
// 2. Usuário abriu o app nos últimos 7 dias (ativo)
// 3. Não enviou notificação nas últimas 12h (evitar spam)

if (user.streak > 3 && user.lastActive < 7days && lastNotif > 12h) {
  sendNotification();
}
```

**Economia:** 50% das notificações (R$ 45 → R$ 22 para 500 usuários)

---

### 3. Usar Gemini Flash em vez de Pro
**Diferença:**
- Flash: $0.075/1M tokens (input)
- Pro: $1.25/1M tokens (input)
- **16x mais barato**

**Trade-off:** Flash é menos "criativo", mas suficiente para desafios estruturados.

**Economia:** Já aplicado nos cálculos acima.

---

## 🚀 ROI (Retorno sobre Investimento)

### Cenário: 200 Usuários Ativos

**Custo Mensal:** R$ 35  
**Impacto Esperado:**
- Retenção D30: 30% → 50% (+20pp)
- Taxa de conversão Freemium→Premium: 5% → 10% (+5pp)

**Cálculo:**
```
Usuários retidos extras: 200 × 20% = 40 usuários
Conversões extras: 200 × 5% = 10 usuários
Receita extra (Premium R$ 97/mês): 10 × R$ 97 = R$ 970/mês

ROI: (R$ 970 - R$ 35) / R$ 35 = 2.671%
```

**Payback:** Imediato (1º mês)

---

## ⚠️ Custos Ocultos a Considerar

### 1. Tempo de Desenvolvimento
**Estágio 1:** 80-100 horas (2-3 semanas)  
**Estágio 2:** 60-80 horas (2-3 semanas)  
**Total:** 140-180 horas

**Custo (se terceirizado a R$ 100/h):** R$ 14.000-18.000  
**Custo (desenvolvimento interno):** R$ 0 (já na equipe)

---

### 2. Manutenção
**Tempo Estimado:** 2-4 horas/mês
- Ajustar badges baseado em feedback
- Criar eventos especiais sazonais
- Monitorar alertas de IA

**Custo:** Negligível (parte do trabalho normal)

---

### 3. Monitoramento
**Ferramentas Necessárias:**
- Sentry (erros): Free tier (5.000 eventos/mês)
- Vercel Analytics: Grátis
- Supabase Logs: Incluído no plano Pro

**Custo Adicional:** R$ 0

---

## 📈 Projeção de Custos (12 meses)

| Mês | Usuários | Custo Mensal | Custo Acumulado |
|-----|----------|--------------|-----------------|
| 1 | 100 | R$ 5 | R$ 5 |
| 3 | 200 | R$ 35 | R$ 75 |
| 6 | 350 | R$ 55 | R$ 240 |
| 12 | 500 | R$ 70 | R$ 600 |

**Custo Total Ano 1:** R$ 600  
**Receita Extra Estimada:** R$ 11.640 (R$ 970/mês × 12)  
**Lucro Líquido:** R$ 11.040

---

## ✅ Conclusão

### É Caro de Manter?
**NÃO.** 

- **Custo inicial:** R$ 0 (desenvolvimento interno)
- **Custo operacional:** R$ 5-70/mês (dependendo da escala)
- **ROI:** 2.600%+ no primeiro mês
- **Manutenção:** 2-4 horas/mês (negligível)

### Principais Vantagens
1. **Escalável:** Custo cresce linearmente com usuários
2. **Automatizado:** Zero trabalho manual após setup
3. **Barato:** IA moderna (Gemini) é extremamente acessível
4. **Alto ROI:** Retenção vale muito mais que o custo

### Recomendação
**IMPLEMENTAR IMEDIATAMENTE.** O custo é irrisório comparado ao impacto em retenção e conversão.

---

## 🎯 Próximos Passos

1. ✅ Aprovar orçamento (R$ 5-70/mês)
2. ✅ Começar Estágio 1 (streak, badges, níveis)
3. ⏳ Medir impacto após 2 semanas
4. ⏳ Implementar Estágio 2 se métricas positivas
5. ⏳ Otimizar custos conforme escala
