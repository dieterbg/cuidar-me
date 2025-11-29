# ⚠️ ATENÇÃO: Arquivos que Precisam de Migração

## 🔴 CRÍTICO - Não Deletar Ainda

### 1. src/app/portal/layout.tsx
**Status:** ❌ AINDA USA FIREBASE  
**Linhas Problemáticas:**
- Linha 25: `import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';`
- Linha 26: `import { db } from '@/lib/firebase';`
- Linhas 61, 94, 107-119: Uso extensivo do Firestore

**Funcionalidade:**
- Layout do portal do paciente
- Cria documento do paciente no Firestore
- Listener em tempo real para status do paciente
- Controla acesso baseado em status (pending/active)

**Ação Necessária:**
- ⚠️ Este arquivo precisa ser migrado para Supabase antes de deletar Firebase
- Substituir Firestore por Supabase Realtime
- Testar fluxo completo de criação e aprovação de paciente

---

### 2. src/app/(dashboard)/patient/[id]/page.tsx
**Status:** ❌ AINDA USA FIREBASE  
**Linha:** 39 - `import { db } from '@/lib/firebase';`

**Ação Necessária:**
- Verificar se está sendo usado
- Migrar para Supabase se necessário

---

## ✅ Arquivos Seguros para Deletar

Após corrigir os arquivos acima, os seguintes podem ser deletados:

### Arquivos Firebase:
- ✅ src/lib/firebase.ts
- ✅ src/lib/firebase-client.ts
- ✅ src/lib/firebase-admin-global.ts
- ✅ src/lib/firebase-admin-global.ts.backup
- ✅ src/lib/firebase-admin-global.ts.backup3
- ✅ src/ai/firestore-admin.ts (69KB)
- ✅ src/ai/firestore-protocols-admin.ts
- ✅ src/app/api/_firebase-admin.js

### Arquivos Backup:
- ✅ src/ai/actions.ts.backup
- ✅ src/ai/actions.ts.backup_completo

### Pastas Debug:
- ✅ src/app/debug/ (toda a pasta)

---

## 📝 Próximos Passos

1. **URGENTE:** Migrar `portal/layout.tsx` para Supabase
2. Verificar `patient/[id]/page.tsx`
3. Testar funcionalidade do portal do paciente
4. Executar limpeza dos arquivos obsoletos
5. Remover dependências Firebase do package.json

---

**Gerado em:** 24/11/2025 21:22
