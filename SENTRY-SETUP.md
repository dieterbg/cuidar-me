#  Sentry Setup - Installation Guide

**Status:** Config criada, pacote NÃO instalado  
**Quando instalar:** Após deploy inicial bem-sucedido

---

## 📦 Installation

```bash
# Install Sentry Next.js SDK
npm install --save @sentry/nextjs

# Run setup wizard
npx @sentry/wizard@latest -i nextjs
```

O wizard irá:
1. Criar `sentry.client.config.ts`
2. Criar `sentry.server.config.ts`
3. Criar `sentry.edge.config.ts`
4. Adicionar ao `next.config.js`

---

## 🔑 Environment Variables

Adicionar ao `.env.local`:

```bash
#Sentry DSN (dashboard → Settings → Projects → [seu-projeto] → Client Keys)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Auth token para sourcemaps (opcional mas recomendado)
SENTRY_AUTH_TOKEN=xxxxx
```

---

## ✅ Verification

Após instalação, testar:

```typescript
// Qualquer página ou API
import { captureError } from './sentry.client.config';

try {
  throw new Error('Test Sentry');
} catch (error) {
  captureError(error);
}
```

Ver erro no dashboard: https://sentry.io/

---

## 📝 Config File Created

A config já está pronta em: `sentry.client.config.ts`  
Só falta instalar o pacote!

---

## ⚠️ Por que não instalamos agora?

1. Sentry adiciona overhead ao build (~30s)
2. Requer DSN (conta Sentry)
3. Não é bloqueador para piloto
4. Melhor instalar após sistema estável

**Instalar quando:** Sistema em produção e precisando monitoring
