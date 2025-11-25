# 🚀 Deploy no Vercel - Cuidar.me

## ✅ Preparação Concluída

- ✅ Repositório Git limpo (405KB vs 2.3GB)
- ✅ Firebase removido do package.json
- ✅ .gitignore atualizado
- ✅ Código 100% Supabase

---

## 📋 Passo a Passo para Deploy

### 1. Criar Repositório no GitHub

```bash
# No GitHub, crie um novo repositório (ex: cuidar-me)
# Depois execute:

git remote add origin https://github.com/SEU-USUARIO/cuidar-me.git
git branch -M main
git push -u origin main
```

### 2. Conectar ao Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Add New Project"**
3. Importe o repositório do GitHub
4. Configure as variáveis de ambiente (ver abaixo)
5. Clique em **"Deploy"**

---

## 🔐 Variáveis de Ambiente no Vercel

Configure estas variáveis em: **Project Settings → Environment Variables**

### Supabase (Obrigatório):
```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Google AI (Obrigatório):
```
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
```

### Twilio (Opcional - para WhatsApp):
```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=whatsapp:+14155238886
```

### Cron (Opcional - para mensagens agendadas):
```
CRON_SECRET=seu-secret-aleatorio-aqui
```

---

## 🎯 Configurações do Projeto no Vercel

### Build Settings:
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### Node.js Version:
- **20.x** (recomendado)

---

## 📊 Checklist Pré-Deploy

- [x] Código limpo e sem Firebase
- [x] .gitignore configurado
- [x] package.json sem dependências Firebase
- [x] Variáveis de ambiente preparadas
- [ ] Repositório no GitHub criado
- [ ] Projeto no Vercel configurado
- [ ] Variáveis de ambiente adicionadas
- [ ] Deploy realizado
- [ ] Supabase Realtime habilitado
- [ ] Teste de funcionalidades

---

## 🔧 Pós-Deploy

### 1. Habilitar Supabase Realtime

No Supabase Dashboard:
1. Vá em **Database → Replication**
2. Habilite Realtime para as tabelas:
   - `patients`
   - `messages`

### 2. Configurar Webhook do Twilio (se usar WhatsApp)

No Twilio Console:
1. Configure o webhook para: `https://seu-app.vercel.app/api/whatsapp`
2. Método: `POST`

### 3. Configurar Cron Job (se usar mensagens agendadas)

No Vercel:
1. Vá em **Settings → Cron Jobs**
2. Adicione: `0 * * * *` (a cada hora)
3. URL: `https://seu-app.vercel.app/api/cron`
4. Header: `Authorization: Bearer SEU_CRON_SECRET`

---

## 🧪 Testar Deploy

Após o deploy, teste:

1. **Login/Registro** - Criar conta e fazer login
2. **Dashboard** - Visualizar pacientes
3. **Portal do Paciente** - Criar paciente pendente
4. **Chat** - Enviar mensagens em tempo real
5. **Protocolos** - Visualizar etapas
6. **Comunidade** - Ver tópicos e comentários
7. **Seed** - Popular dados de exemplo

---

## 📈 Monitoramento

### Logs do Vercel:
- Acesse **Deployments → Logs**
- Monitore erros e performance

### Supabase Dashboard:
- Monitore uso de API
- Verifique Realtime connections
- Analise queries lentas

---

## 🐛 Troubleshooting

### Erro: "Module not found"
```bash
# Limpar cache e reinstalar
rm -rf node_modules .next
npm install
npm run build
```

### Erro: "Supabase connection failed"
- Verifique as variáveis de ambiente
- Confirme que as chaves estão corretas
- Verifique RLS policies no Supabase

### Erro: "Realtime not working"
- Habilite Realtime no Supabase Dashboard
- Verifique se as tabelas estão publicadas
- Confirme que o client está subscrito

---

## 📚 Recursos Úteis

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Twilio WhatsApp](https://www.twilio.com/docs/whatsapp)

---

## ✅ Resumo

**Antes:**
- 🔴 2.3GB de Git
- 🔴 Firebase + Supabase
- 🔴 Arquivos obsoletos

**Depois:**
- ✅ 405KB de Git
- ✅ 100% Supabase
- ✅ Código limpo
- ✅ Pronto para produção

---

**Próximo passo:** Criar repositório no GitHub e fazer o primeiro deploy! 🚀
