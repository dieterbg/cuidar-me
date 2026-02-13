# 🚀 Plano de Migração: Firebase → Supabase

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Preparação](#preparação)
3. [Configuração do Supabase](#configuração-do-supabase)
4. [Migração de Dados](#migração-de-dados)
5. [Refatoração do Código](#refatoração-do-código)
6. [Testes](#testes)
7. [Deploy](#deploy)
8. [Checklist Final](#checklist-final)

---

## 🎯 Visão Geral

### O que será migrado:

- ✅ **Autenticação**: Firebase Auth → Supabase Auth
- ✅ **Banco de Dados**: Firestore → PostgreSQL
- ✅ **Storage**: Firebase Storage → Supabase Storage (futuro)
- ✅ **Realtime**: Firestore Realtime → Supabase Realtime
- ✅ **Server Actions**: Mantidos, mas usando Supabase Client

### O que NÃO muda:

- ✅ **WhatsApp/Twilio**: Continua igual
- ✅ **IA/Gemini**: Continua igual
- ✅ **Next.js**: Continua igual
- ✅ **UI Components**: Continua igual

---

## 🛠️ Fase 1: Preparação

### 1.1 Criar Projeto no Supabase

```bash
# 1. Acessar https://supabase.com
# 2. Criar novo projeto
# 3. Anotar:
#    - Project URL: https://xxxxx.supabase.co
#    - Anon Key: eyJhbGc...
#    - Service Role Key: eyJhbGc... (NUNCA expor no cliente!)
```

### 1.2 Instalar Dependências

```bash
npm install @supabase/supabase-js @supabase/ssr
npm uninstall firebase firebase-admin
```

### 1.3 Atualizar `.env`

```env
# Remover variáveis do Firebase
# NEXT_PUBLIC_FIREBASE_API_KEY=...
# FIREBASE_PROJECT_ID=...
# etc.

# Adicionar variáveis do Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Manter Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# Manter Cron
CRON_SECRET=CuidarMeCronSecret123
```

---

## 🗄️ Fase 2: Configuração do Supabase

### 2.1 Executar Migration Inicial

```bash
# No dashboard do Supabase:
# 1. Ir em SQL Editor
# 2. Copiar e colar o conteúdo de supabase/migrations/001_initial_schema.sql
# 3. Executar

# OU usar Supabase CLI (recomendado):
npx supabase init
npx supabase link --project-ref xxxxx
npx supabase db push
```

### 2.2 Configurar Auth

No dashboard do Supabase:

1. **Authentication > Providers**
   - Habilitar Email/Password
   - Configurar Email Templates (opcional)

2. **Authentication > URL Configuration**
   - Site URL: `http://localhost:9002` (dev) ou `https://seu-dominio.com` (prod)
   - Redirect URLs: Adicionar URLs permitidas

3. **Authentication > Email Templates**
   - Customizar templates de confirmação, reset de senha, etc.

### 2.3 Gerar Types TypeScript

```bash
npx supabase gen types typescript --project-id xxxxx > src/lib/supabase-types.ts
```

---

## 📦 Fase 3: Migração de Dados

### 3.1 Exportar Dados do Firestore

Criar script de exportação:

```typescript
// scripts/export-firestore.ts
import { getDb } from '@/lib/firebase-admin-global';
import fs from 'fs';

async function exportFirestore() {
  const db = getDb();
  const data: any = {};

  // Exportar pacientes
  const patientsSnapshot = await db.collection('patients').get();
  data.patients = patientsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Exportar protocolos
  const protocolsSnapshot = await db.collection('protocols').get();
  data.protocols = protocolsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Exportar mensagens
  for (const patient of data.patients) {
    const messagesSnapshot = await db
      .collection('patients')
      .doc(patient.id)
      .collection('messages')
      .get();
    
    patient.messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  // Salvar em JSON
  fs.writeFileSync('firestore-export.json', JSON.stringify(data, null, 2));
  console.log('✅ Dados exportados para firestore-export.json');
}

exportFirestore();
```

### 3.2 Importar Dados para Supabase

Criar script de importação:

```typescript
// scripts/import-supabase.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Usar Service Role para bypass RLS
);

async function importToSupabase() {
  const data = JSON.parse(fs.readFileSync('firestore-export.json', 'utf-8'));

  // Importar pacientes
  for (const patient of data.patients) {
    const { error } = await supabase.from('patients').insert({
      id: patient.id,
      full_name: patient.fullName,
      whatsapp_number: patient.whatsappNumber,
      plan: patient.subscription.plan,
      priority: patient.subscription.priority,
      status: patient.status || 'active',
      needs_attention: patient.needsAttention || false,
      total_points: patient.gamification.totalPoints,
      level: patient.gamification.level,
      badges: patient.gamification.badges,
      last_message: patient.lastMessage,
      last_message_timestamp: patient.lastMessageTimestamp,
      // ... outros campos
    });

    if (error) {
      console.error('Erro ao importar paciente:', patient.id, error);
    } else {
      console.log('✅ Paciente importado:', patient.fullName);
    }

    // Importar mensagens do paciente
    if (patient.messages) {
      for (const message of patient.messages) {
        await supabase.from('messages').insert({
          patient_id: patient.id,
          sender: message.sender,
          text: message.text,
          created_at: message.timestamp,
        });
      }
    }
  }

  // Importar protocolos
  for (const protocol of data.protocols) {
    await supabase.from('protocols').insert({
      id: protocol.id,
      name: protocol.name,
      description: protocol.description,
      duration_days: protocol.durationDays,
      eligible_plans: protocol.eligiblePlans,
    });

    // Importar passos do protocolo
    for (const step of protocol.messages) {
      await supabase.from('protocol_steps').insert({
        protocol_id: protocol.id,
        day: step.day,
        title: step.title,
        message: step.message,
        is_gamification: step.isGamification || false,
        perspective: step.perspective,
      });
    }
  }

  console.log('✅ Importação concluída!');
}

importToSupabase();
```

---

## 💻 Fase 4: Refatoração do Código

### 4.1 Criar Cliente Supabase

```typescript
// src/lib/supabase-client.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

```typescript
// src/lib/supabase-server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

### 4.2 Atualizar Hook de Autenticação

```typescript
// src/hooks/use-auth.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase-types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata: any) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data);
    }
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, metadata: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    if (error) throw error;

    // Criar perfil
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email,
        display_name: metadata.displayName,
        role: metadata.role,
        phone: metadata.phone,
      });
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### 4.3 Atualizar Server Actions

```typescript
// src/ai/actions.ts
'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export async function getPatients() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('patients')
    .select(`
      *,
      patient_protocols!inner (
        *,
        protocols (*)
      ),
      weekly_progress (*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPatientDetails(patientId: string) {
  const supabase = createClient();

  // Buscar paciente
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (patientError) throw patientError;

  // Buscar mensagens
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true });

  if (messagesError) throw messagesError;

  // Buscar métricas
  const { data: metrics, error: metricsError } = await supabase
    .from('health_metrics')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: false });

  if (metricsError) throw metricsError;

  return { patient, messages, metrics };
}

export async function updatePatient(patientId: string, updates: any) {
  const supabase = createClient();

  const { error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', patientId);

  if (error) throw error;

  revalidatePath('/patients');
  return { success: true };
}

export async function addMessage(patientId: string, message: { sender: string; text: string }) {
  const supabase = createClient();

  const { error } = await supabase.from('messages').insert({
    patient_id: patientId,
    sender: message.sender,
    text: message.text,
  });

  if (error) throw error;

  // Atualizar última mensagem do paciente
  await supabase
    .from('patients')
    .update({
      last_message: message.text,
      last_message_timestamp: new Date().toISOString(),
    })
    .eq('id', patientId);

  return { success: true };
}

export async function assignProtocolToPatient(
  patientId: string,
  protocolId: string,
  weightGoal: number | null
) {
  const supabase = createClient();

  // 1. Buscar protocolo com passos
  const { data: protocol, error: protocolError } = await supabase
    .from('protocols')
    .select(`
      *,
      protocol_steps (*)
    `)
    .eq('id', protocolId)
    .single();

  if (protocolError) throw protocolError;

  // 2. Buscar paciente
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('whatsapp_number')
    .eq('id', patientId)
    .single();

  if (patientError) throw patientError;

  // 3. Criar atribuição de protocolo
  const { error: assignError } = await supabase
    .from('patient_protocols')
    .insert({
      patient_id: patientId,
      protocol_id: protocolId,
      weight_goal_kg: weightGoal,
    });

  if (assignError) throw assignError;

  // 4. Agendar mensagens
  const startDate = new Date();
  const steps = protocol.protocol_steps;

  for (const step of steps) {
    const sendAt = new Date(startDate);
    sendAt.setDate(sendAt.getDate() + step.day - 1);

    await supabase.from('scheduled_messages').insert({
      patient_id: patientId,
      patient_whatsapp_number: patient.whatsapp_number,
      message_content: step.message,
      send_at: sendAt.toISOString(),
      source: 'protocol',
    });
  }

  revalidatePath(`/patient/${patientId}`);
  return { success: true };
}

// ... mais funções
```

### 4.4 Atualizar Processamento de Mensagens

```typescript
// src/ai/handle-patient-reply.ts
'use server';

import { createClient } from '@/lib/supabase-server';
import { generateChatbotReply } from './flows/generate-chatbot-reply';
import { sendWhatsappMessage } from '@/lib/twilio';

export async function handlePatientReply(
  patientPhone: string,
  patientMessage: string,
  patientName: string
) {
  const supabase = createClient();

  // 1. Buscar ou criar paciente
  let { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('whatsapp_number', patientPhone)
    .single();

  if (error && error.code === 'PGRST116') {
    // Paciente não existe, criar
    const { data: newPatient, error: createError } = await supabase
      .from('patients')
      .insert({
        full_name: patientName,
        whatsapp_number: patientPhone,
        status: 'pending',
      })
      .select()
      .single();

    if (createError) throw createError;
    patient = newPatient;
  }

  if (!patient) throw new Error('Failed to get or create patient');

  // 2. Adicionar mensagem ao histórico
  await supabase.from('messages').insert({
    patient_id: patient.id,
    sender: 'patient',
    text: patientMessage,
  });

  // 3. Buscar contexto do protocolo
  let protocolContext = '';
  const { data: activeProtocol } = await supabase
    .from('patient_protocols')
    .select(`
      *,
      protocols (
        *,
        protocol_steps (*)
      )
    `)
    .eq('patient_id', patient.id)
    .eq('is_active', true)
    .single();

  if (activeProtocol) {
    const todayStep = activeProtocol.protocols.protocol_steps.find(
      (s: any) => s.day === activeProtocol.current_day
    );
    if (todayStep) {
      protocolContext = `Última mensagem do protocolo (dia ${activeProtocol.current_day}): "${todayStep.message}"`;
    }
  }

  // 4. Gerar resposta com IA
  const aiResponse = await generateChatbotReply({
    patient,
    patientMessage,
    protocolContext,
  });

  // 5. Processar decisão
  if (aiResponse.decision === 'escalate') {
    // Criar requisição de atenção
    await supabase.from('attention_requests').insert({
      patient_id: patient.id,
      reason: aiResponse.attentionRequest!.reason,
      trigger_message: patientMessage,
      ai_summary: aiResponse.attentionRequest!.aiSummary,
      ai_suggested_reply: aiResponse.attentionRequest!.aiSuggestedReply,
      priority: aiResponse.attentionRequest!.priority,
    });

    // Marcar paciente como precisando atenção
    await supabase
      .from('patients')
      .update({ needs_attention: true })
      .eq('id', patient.id);

    // Enviar mensagem de escalação
    if (aiResponse.chatbotReply) {
      await sendWhatsappMessage(patientPhone, aiResponse.chatbotReply);
      await supabase.from('messages').insert({
        patient_id: patient.id,
        sender: 'me',
        text: aiResponse.chatbotReply,
      });
    }
  } else {
    // Responder automaticamente
    if (aiResponse.chatbotReply) {
      await sendWhatsappMessage(patientPhone, aiResponse.chatbotReply);
      await supabase.from('messages').insert({
        patient_id: patient.id,
        sender: 'me',
        text: aiResponse.chatbotReply,
      });
    }

    // Processar dados extraídos
    if (aiResponse.extractedData) {
      // Adicionar métrica de saúde
      if (aiResponse.extractedData.weight) {
        await supabase.from('health_metrics').insert({
          patient_id: patient.id,
          date: new Date().toISOString().split('T')[0],
          weight_kg: aiResponse.extractedData.weight,
        });
      }

      // Atualizar gamificação
      // ... (usar função SQL update_gamification_progress)
    }
  }

  // 6. Atualizar última mensagem
  await supabase
    .from('patients')
    .update({
      last_message: patientMessage,
      last_message_timestamp: new Date().toISOString(),
    })
    .eq('id', patient.id);
}
```

---

## 🧪 Fase 5: Testes

### 5.1 Testes Unitários

```typescript
// __tests__/supabase-actions.test.ts
import { describe, it, expect } from 'vitest';
import { getPatients, updatePatient } from '@/ai/actions';

describe('Supabase Actions', () => {
  it('should fetch patients', async () => {
    const patients = await getPatients();
    expect(patients).toBeInstanceOf(Array);
  });

  it('should update patient', async () => {
    const result = await updatePatient('patient-id', {
      full_name: 'Novo Nome',
    });
    expect(result.success).toBe(true);
  });
});
```

### 5.2 Testes de Integração

```bash
# Testar autenticação
# Testar CRUD de pacientes
# Testar atribuição de protocolos
# Testar processamento de mensagens
# Testar gamificação
```

---

## 🚀 Fase 6: Deploy

### 6.1 Configurar Variáveis de Ambiente (Produção)

```env
# Vercel/Railway
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
CRON_SECRET=...
```

### 6.2 Deploy

```bash
# Vercel
vercel --prod

# OU Railway
railway up
```

### 6.3 Configurar Cron Job

Atualizar Google Cloud Scheduler para apontar para novo domínio.

---

## ✅ Checklist Final

### Antes de Migrar

- [ ] Backup completo do Firestore
- [ ] Projeto Supabase criado
- [ ] Schema SQL executado
- [ ] Variáveis de ambiente configuradas
- [ ] Dependências instaladas

### Durante Migração

- [ ] Dados exportados do Firestore
- [ ] Dados importados para Supabase
- [ ] Código refatorado
- [ ] Testes passando
- [ ] Auth funcionando
- [ ] WhatsApp funcionando
- [ ] IA funcionando
- [ ] Gamificação funcionando

### Depois da Migração

- [ ] Deploy em produção
- [ ] Cron job configurado
- [ ] Monitoramento ativo
- [ ] Backup do Supabase configurado
- [ ] Documentação atualizada
- [ ] Firebase desativado (após período de teste)

---

## 🎉 Vantagens Conquistadas

Após a migração, você terá:

✅ **Queries SQL poderosas** (JOINs, agregações, etc.)  
✅ **Realtime melhorado** (websockets nativos)  
✅ **RLS granular** (segurança no nível do banco)  
✅ **Types TypeScript gerados automaticamente**  
✅ **Custo mais previsível**  
✅ **Melhor DX** (dashboard, migrations, etc.)  
✅ **Open source** (sem vendor lock-in)  
✅ **Storage integrado** (para futuras features)  

---

## 📚 Recursos

- [Documentação Supabase](https://supabase.com/docs)
- [Supabase + Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Migração Firebase → Supabase](https://supabase.com/docs/guides/migrations/firebase)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Pronto para começar a migração?** 🚀
