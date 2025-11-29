# 🔄 ROLLBACK PLAN - Cuidar.me

**Data:** 27/11/2025  
**Versão:** 1.0  
**Tempo de Execução:** ~15-30 minutos

---

## 🎯 OBJETIVO

Procedimento para reverter o sistema para versão estável em caso de falha crítica durante o piloto.

---

## ⚠️ QUANDO EXECUTAR ROLLBACK

### Critérios de Falha Crítica

- [x] **Build não compila** após deploy
- [x] **Cron jobs falhando** (>3 tentativas)
- [x] **Mensagens não chegando** aos pacientes
- [x] **Gamificação quebrada** (pontos não atribuídos)
- [x] **Erro 500** em >50% das requisições
- [x] **Database inacessível** ou corrompida

### Quando NÃO fazer rollback

- [ ] Bug menor que não afeta core functionality
- [ ] Problema visual/CSS
- [ ] Feature opcional quebrada

---

## 📋 PROCEDIMENTO DE ROLLBACK

### Passo 1: Notificar Equipe (2min)

```bash
# Criar incident no Slack/Discord
MENSAGEM: "🚨 ROLLBACK INICIADO - [MOTIVO]
Estimativa: 15min
Status: Em progresso"
```

---

### Passo 2: Desativar Cron Jobs (1min)

**Opção A: Via Vercel Dashboard**
1. Ir em: https://vercel.com/[seu-projeto]/settings/crons
2. Temporariamente desabilitar:
   - `schedule-protocol-messages` (6h)
   - `process-message-queue` (hourly)

**Opção B: Via CLI**
```bash
vercel env rm CRON_SECRET
# Sem secret, crons falham autenticação
```

---

### Passo 3: Reverter Deploy (5min)

```bash
# Opção A: Via Dashboard
# 1. Ir em Deployments
# 2. Encontrar último deploy estável
# 3. Clicar em "..." → "Promote to Production"

# Opção B: Via Git + CLI
git log --oneline -10  # Ver últimos commits
git revert HEAD        # Reverter commit problemático
git push origin main

vercel --prod          # Deploy nova versão
```

**Commits conhecidos estáveis:**
```
# Antes das correções de bugs médios
[HASH_DO_COMMIT_ESTÁVEL]

# Verificar hash:
git log --grep="BUILD PASSING" -1
```

---

### Passo 4: Rollback Database (se necessário) (10min)

**⚠️ CUIDADO:** Só fazer se migration quebrou!

```sql
-- Ver migrations aplicadas
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 5;

-- Reverter migration específica
-- Exemplo: metadata column
ALTER TABLE scheduled_messages DROP COLUMN IF EXISTS metadata;

-- Confirmar
SELECT column_name FROM information_schema.columns
WHERE table_name = 'scheduled_messages';
```

**Backup antes:**
```bash
# Via Supabase Dashboard
# Settings → Database → Backup → Create backup
```

---

### Passo 5: Verificar Saúde do Sistema (5min)

```bash
# Health checks
curl https://[seu-dominio]/api/health

# Test cron endpoint (com secret)
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://[seu-dominio]/api/cron/schedule-protocol-messages

# Ver logs
vercel logs --prod
```

---

### Passo 6: Reativar Cron Jobs (1min)

**Se rollback funcionou:**
```bash
# Via Dashboard ou
vercel env add CRON_SECRET
# Valor: [seu_secret_original]
```

---

### Passo 7: Monitorar por 1h (60min)

**Checklist de verificação:**
- [ ] Build está compilando
- [ ] Crons rodando (ver logs)
- [ ] Mensagens sendo enviadas
- [ ] Gamificação funcionando
- [ ] Zero erros 500

---

## 📞 COMUNICAÇÃO COM PACIENTES

### Se rollback causar gap de mensagens

**Template WhatsApp:**
```
Olá [Nome]! 👋

Você pode ter sentido uma pequena pausa nas nossas mensagens hoje.
Já está tudo funcionando normalmente!

Continue respondendo seus check-ins. Estamos aqui! 💪
```

**Envio:**
- Via Twilio manualmente
- Ou aguardar próximo cron

---

## 🔍 POST-MORTEM

**Após rollback estável, documentar:**

1. **O que deu errado?**
   - [Descrever problema]

2. **Por que não detectamos antes?**
   - [Falta de teste? Ambiente diferente?]

3. **Como prevenir?**
   - [ ] Adicionar teste
   - [ ] Melhorar CI/CD
   - [ ] Staging obrigatório

4. **Timeline:**
   - [HH:MM] Problema detectado
   - [HH:MM] Rollback iniciado
   - [HH:MM] Sistema estável

---

## 🚀 CENÁRIOS ESPECÍFICOS

### Cenário 1: Build Quebrado

```bash
# Sintoma: Erro de compilação
# Solução rápida:
git revert HEAD
git push
vercel --prod
```

**Tempo:** 5min

---

### Cenário 2: Cron Jobs Falhando

```bash
# Sintoma: Mensagens não enviando
# Debug:
vercel logs --prod | grep "\[SCHEDULER\]"

# Solução temporária:
# 1. Desabilitar crons
# 2. Enviar mensagens manualmente
# 3. Investigar e fix
```

**Tempo:** 15min

---

### Cenário 3: Database Migration Falhou

```sql
-- Sintoma: Erros de coluna não existente
-- Solução:
-- 1. Reverter migration (ver Passo 4)
-- 2. Deploy código anterior
-- 3. Validar schema
```

**Tempo:** 20min

---

### Cenário 4: Gamificação Quebrada

```bash
# Sintoma: Pontos não atribuídos
# Não precisa rollback total!
# Solução:
# 1. Identificar bug específico
# 2. Deploy hotfix apenas dessa parte
# 3. Pacientes podem responder novamente
```

**Tempo:** Variável

---

## ✅ CHECKLIST COMPLETO

### Pré-Rollback
- [ ] Confirmar que é necessário
- [ ] Notificar equipe
- [ ] Identificar último commit estável

### Durante Rollback
- [ ] Desativar crons
- [ ] Reverter deploy
- [ ] Rollback DB (se necessário)
- [ ] Verificar saúde
- [ ] Reativar (se ok)

### Pós-Rollback
- [ ] Monitorar por 1h
- [ ] Comunicar pacientes (se necessário)
- [ ] Documentar post-mortem
- [ ] Planejar fix

---

## 📞 CONTATOS DE EMERGÊNCIA

```
# Supabase Support
support@supabase.com

# Vercel Support
https://vercel.com/support

# Twilio Status
https://status.twilio.com/
```

---

## 🔐 BACKUP DO .ENV

**Sempre manter cópia:**

```bash
# Fazer backup antes de qualquer deploy
cp .env .env.backup.$(date +%Y%m%d)

# Lista de backups
ls -la .env.backup.*
```

---

## ⏱️ TIMELINE IDEAL

| Minuto | Ação |
|--------|------|
| 0-2 | Identificar problema + Notificar |
| 2-3 | Desativar crons |
| 3-8 | Reverter deploy |
| 8-18 | Rollback DB (se necessário) |
| 18-23 | Verificação de saúde |
| 23-24 | Reativar crons |
| 24-84 | Monitoramento (1h) |

**Total:** 15-30min (+ 1h monitoramento)

---

## ✅ CONCLUSÃO

Este plano garante que podemos reverter rapidamente para versão estável, minimizando impacto aos pacientes.

**Pratica antes do piloto:**
```bash
# Fazer dry-run em staging
# Simular rollback completo
# Tempo médio: 15min
```

---

**Criado:** 27/11/2025  
**Revisado:** Senior Engineer  
**Status:** 🟢 Aprovado para uso
