# 🧹 Limpeza do Repositório Git

## ⚠️ PROBLEMA IDENTIFICADO

O repositório Git está com **2.3GB** devido a arquivos grandes commitados por engano:

| Arquivo | Tamanho | Status |
|---------|---------|--------|
| `projeto_backup_20251023.zip` | **1.75GB** | ❌ No histórico Git |
| `project-backup.zip` | **604MB** | ❌ No histórico Git |
| `ngrok` (múltiplas versões) | **~72MB** | ❌ No histórico Git |

**Total no Git:** 2.28GB  
**Total do projeto (sem .git):** ~1.5GB

---

## 🎯 Solução Recomendada

### Opção 1: Limpar Histórico Git (Recomendado)

Use `git filter-repo` ou `BFG Repo-Cleaner` para remover arquivos grandes do histórico:

```bash
# Instalar BFG (mais fácil)
# Download: https://rtyley.github.io/bfg-repo-cleaner/

# Remover arquivos grandes
java -jar bfg.jar --strip-blobs-bigger-than 10M .

# Limpar histórico
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Opção 2: Criar Novo Repositório (Mais Rápido)

```bash
# Backup do .git atual
mv .git .git.backup

# Criar novo repositório
git init
git add .
git commit -m "Initial commit - Clean repository"

# Adicionar remote (se tiver)
git remote add origin <seu-repo-url>
git push -f origin main
```

---

## 📋 Arquivos Grandes no `src/`

Apenas 1 arquivo grande encontrado:
- `src/lib/data.ts` - **52KB** (dados mockados)

**Recomendação:** Mover para `__mocks__/data.ts` ou `fixtures/`

---

## 🚀 Para Deploy no Vercel

### 1. Adicionar ao `.gitignore`:

```gitignore
# Arquivos grandes
*.zip
ngrok
ngrok.exe

# Build
.next/
node_modules/

# Env
.env.local
.env*.local

# Vercel
.vercel
```

### 2. Limpar antes do deploy:

```bash
# Remover pastas grandes
rm -rf .next node_modules

# Reinstalar dependências limpas
npm install

# Build para verificar
npm run build
```

---

## 📊 Tamanhos Atuais

```
.git/         2.3GB  ⚠️ PROBLEMA
.next/        843MB  (build cache - ok deletar)
node_modules/ 714MB  (dependências - normal)
src/          630KB  ✅ OK
```

---

## ✅ Checklist para Vercel

- [ ] Limpar histórico Git ou criar novo repo
- [ ] Adicionar `.gitignore` completo
- [ ] Remover `firebase` do `package.json`
- [ ] Configurar variáveis de ambiente no Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GOOGLE_GENERATIVE_AI_API_KEY`
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER`
  - `CRON_SECRET`
- [ ] Fazer deploy

---

**Quer que eu execute a limpeza agora?**
- A) Criar novo repositório Git limpo
- B) Apenas adicionar ao .gitignore e continuar
- C) Usar BFG para limpar histórico
