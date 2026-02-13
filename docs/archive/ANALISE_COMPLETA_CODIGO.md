# 📋 Análise Completa do Código - Cuidar.me

## 🎯 Visão Geral do Sistema

O **Cuidar.me** é uma plataforma completa de acompanhamento de pacientes em programas de emagrecimento, com integração de IA (Google Gemini), WhatsApp (Twilio), Firebase/Firestore e gamificação. O sistema foi desenvolvido com Next.js 14, TypeScript, e utiliza uma arquitetura moderna com Server Actions e componentes React.

---

## 📁 Estrutura do Projeto

```
Cuidar-me/
├── src/
│   ├── app/                    # Rotas e páginas Next.js
│   │   ├── (dashboard)/        # Área protegida do dashboard
│   │   ├── api/                # API Routes
│   │   ├── portal/             # Portal do paciente
│   │   ├── page.tsx            # Página de login/registro
│   │   └── layout.tsx          # Layout raiz
│   ├── ai/                     # Lógica de IA e Server Actions
│   │   ├── flows/              # Fluxos de IA (Gemini)
│   │   ├── actions.ts          # Server Actions principais
│   │   ├── firestore-admin.ts  # Operações do Firestore
│   │   └── firestore-protocols-admin.ts
│   ├── components/             # Componentes React
│   │   ├── ui/                 # Componentes UI (shadcn)
│   │   └── AppLayout.tsx       # Layout do dashboard
│   ├── hooks/                  # Custom hooks
│   │   └── use-auth.tsx        # Hook de autenticação
│   ├── lib/                    # Bibliotecas e utilitários
│   │   ├── firebase-admin-global.ts  # Firebase Admin SDK
│   │   ├── firebase-client.ts        # Firebase Client SDK
│   │   ├── types.ts                  # Definições de tipos
│   │   ├── data.ts                   # Dados de exemplo
│   │   └── twilio.ts                 # Integração Twilio
│   └── config/
├── .env                        # Variáveis de ambiente
└── package.json
```

---

## 🔐 1. Autenticação e Sessões

### 1.1 Firebase Client (`src/lib/firebase-client.ts`)

```typescript
// Inicialização do Firebase Client (navegador)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  // ... outras configs
};

export const app = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApp();
```

**Função:** Inicializa o Firebase no lado do cliente usando o padrão singleton para evitar múltiplas inicializações.

### 1.2 Firebase Admin (`src/lib/firebase-admin-global.ts`)

```typescript
// Inicialização GLOBAL do Firebase Admin (servidor)
function initializeFirebaseAdmin() {
  if (globalForFirebase.firebaseAdmin?.name) {
    return globalForFirebase.firebaseAdmin;
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
  
  globalForFirebase.firebaseAdmin = app;
  return app;
}

// Funções auxiliares
export function getAuth() {
  return getInitializedAdmin().auth();
}

export function getDb() {
  return getInitializedAdmin().firestore();
}
```

**Função:** Inicializa o Firebase Admin SDK no servidor de forma global, evitando reinicializações. Fornece acesso ao Auth e Firestore.

### 1.3 Hook de Autenticação (`src/hooks/use-auth.tsx`)

```typescript
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Criar sessão no servidor
        firebaseUser.getIdToken().then(idToken => {
          createSession(idToken).catch(err => {
            console.error("Error creating session:", err);
          });
        });
        
        // Buscar perfil do usuário
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (profileDoc.exists()) {
          setUserProfile(profileDoc.data() as UserProfile);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const createUserProfile = async (firebaseUser: User, options: {...}) => {
    // Cria perfil no Firestore
    const userProfileData: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: options.displayName,
      role: options.role,
      phone: options.phone,
    };
    
    await setDoc(doc(db, "users", firebaseUser.uid), userProfileData);
    setUserProfile(userProfileData);
    
    // Criar sessão no servidor
    const idToken = await firebaseUser.getIdToken();
    await createSession(idToken);
    
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, logout, createUserProfile, ... }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Função:** 
- Monitora estado de autenticação do Firebase
- Cria sessões no servidor via cookies HTTP-only
- Gerencia perfil do usuário no Firestore
- Fornece funções de login/logout/registro

### 1.4 Server Actions de Autenticação (`src/ai/actions.ts`)

```typescript
export async function createSession(idToken: string) {
  const adminAuth = getAuth();
  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 dias
  
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { 
    expiresIn 
  });

  cookies().set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 5,
    path: '/',
  });

  return { success: true };
}

async function getCurrentUserId(): Promise<string | null> {
  const adminAuth = getAuth();
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedToken.uid;
  } catch (error) {
    return null;
  }
}
```

**Função:** Cria e verifica cookies de sessão seguros no servidor.

---

## 👥 2. Sistema de Tipos e Dados

### 2.1 Tipos Principais (`src/lib/types.ts`)

```typescript
// Tipos de usuário
export type UserRole = "medico_dono" | "equipe_saude" | "assistente" | "paciente" | "pendente";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  phone?: string;
}

// Tipos de plano
export type PatientPlan = 'freemium' | 'premium' | 'vip';

// Estrutura do paciente
export interface Patient {
  id: string;
  fullName: string;
  whatsappNumber: string;
  needsAttention: boolean;
  
  subscription: {
    plan: PatientPlan;
    priority: 1 | 2 | 3; // 1=Freemium, 2=Premium, 3=VIP
  };
  
  protocol: {
    protocolId: string;
    startDate: Date | string;
    currentDay: number;
    isActive: boolean;
    weightGoal?: number | null;
  } | null;
  
  gamification: {
    totalPoints: number;
    level: string;
    badges: string[];
    weeklyProgress: WeeklyProgress;
  };
  
  attentionRequest?: {
    reason: string;
    triggerMessage: string;
    aiSummary: string;
    aiSuggestedReply: string;
    priority: 1 | 2 | 3;
    createdAt: string | Date | Timestamp;
  } | null;
  
  activeCheckin: {
    perspective: Perspective;
    sentAt: Date | string | Timestamp;
  } | null;
  
  // Campos legados para compatibilidade
  name: string;
  avatar: string;
  email?: string;
  lastMessage: string;
  lastMessageTimestamp: Date | string;
  riskLevel?: 'low' | 'medium' | 'high';
  status?: 'active' | 'pending';
}

// Perspectivas de gamificação
export type Perspective = 'alimentacao' | 'movimento' | 'hidratacao' | 'disciplina' | 'bemEstar';

// Protocolo
export interface Protocol {
  id: string;
  name: string;
  description: string;
  durationDays: number;
  eligiblePlans: PatientPlan[];
  messages: ProtocolStep[];
}

export interface ProtocolStep {
  day: number;
  title: string;
  message: string;
  isGamification?: boolean;
  perspective?: Perspective;
}

// Mensagens agendadas
export interface ScheduledMessage {
  id: string;
  patientId: string;
  patientWhatsappNumber: string;
  messageContent: string;
  sendAt: string | Date | Timestamp;
  status: 'pending' | 'sent' | 'error';
  source: 'protocol' | 'dynamic_reminder';
  createdAt: string | Date;
  errorInfo: string | null;
}
```

**Função:** Define todos os tipos TypeScript usados no sistema, garantindo type-safety.

### 2.2 Dados de Exemplo (`src/lib/data.ts`)

```typescript
// Configuração de gamificação
export const gamificationConfig: GamificationConfig = {
  perspectiveGoals: {
    alimentacao: 5,
    movimento: 5,
    hidratacao: 5,
    disciplina: 5,
    bemEstar: 5,
  },
  actions: [
    { actionId: 'check_in_refeicao', perspective: 'alimentacao', points: { 'A': 20, 'B': 15, 'C': 10 }, checkinTriggerText: 'Check-in de Refeição' },
    { actionId: 'registrar_atividade_fisica', perspective: 'movimento', points: 40, checkinTriggerText: 'Check-in de Atividade Física' },
    // ... mais ações
  ]
};

// Mensagens de gamificação obrigatórias (injetadas em todos os protocolos)
export const mandatoryGamificationSteps: (ProtocolStep & { perspective: Perspective })[] = [
  // Check-ins semanais de peso (13 semanas)
  ...Array.from({ length: 13 }, (_, i) => ({ 
    day: (i * 7) + 1,
    title: `[GAMIFICAÇÃO] Check-in Semanal de Peso (Semana ${i + 1})`, 
    message: i === 0 
      ? "Bem-vindo(a) ao seu novo protocolo! Para nosso ponto de partida, por favor, me informe seu peso de hoje."
      : `Olá! Chegou o dia do nosso check-in semanal. Por favor, me informe seu peso de hoje em jejum.`,
    perspective: 'disciplina' as Perspective
  })),
  
  // Check-ins diários de hidratação (91 dias)
  ...Array.from({ length: 13 * 7 }, (_, i) => ({
    day: i + 1,
    title: `[GAMIFICAÇÃO] Check-in de Hidratação`,
    message: 'Lembrete de hidratação! 💧 Sobre sua meta de água hoje, como você se saiu? Responda apenas com a letra:\n\nA) Bati a meta.\nB) Cheguei perto.\nC) Esqueci completamente.',
    perspective: 'hidratacao' as Perspective
  })),
  // ... mais check-ins
];

// Protocolos de 90 dias
export const protocols: Protocol[] = [
  {
    id: 'fundamentos_90_dias',
    name: 'Protocolo Fundamentos (90 Dias)',
    description: 'Focado em criar hábitos básicos...',
    durationDays: 90,
    eligiblePlans: ['premium', 'vip'],
    messages: [
      { day: 2, title: 'Meta de Hidratação', message: "Olá! Vamos começar com o básico: hidratação..." },
      // ... mensagens de conteúdo
    ]
  },
  // ... mais protocolos
];

// Pacientes de exemplo
export const patients: Patient[] = [
  {
    id: 'p001',
    fullName: 'Roberto Andrade',
    whatsappNumber: 'whatsapp:+5511999990001',
    needsAttention: false,
    subscription: { plan: 'vip', priority: 3 },
    protocol: {
      protocolId: 'performance_90_dias',
      startDate: sub(now, { days: 15 }).toISOString(),
      currentDay: 16,
      isActive: true,
      weightGoal: 95,
    },
    gamification: {
      totalPoints: 720,
      level: 'Praticante',
      badges: ["pe_direito_badge", "bom_de_garfo_badge"],
      weeklyProgress: { ... }
    },
    // ... mais campos
  },
  // ... mais pacientes
];
```

**Função:** Fornece dados de exemplo para popular o banco de dados e configurações de gamificação.

---

## 🤖 3. Integração com IA (Google Gemini)

### 3.1 Fluxos de IA (`src/ai/flows/`)

#### 3.1.1 Geração de Resposta do Chatbot

```typescript
// src/ai/flows/generate-chatbot-reply.ts
export async function generateChatbotReply(input: GenerateChatbotReplyInput): Promise<GenerateChatbotReplyOutput> {
  const { patient, patientMessage, protocolContext } = input;

  const prompt = `
Você é um assistente de saúde inteligente...

PACIENTE:
- Nome: ${patient.fullName}
- Plano: ${patient.subscription.plan}
- Protocolo Ativo: ${patient.protocol?.protocolId || 'Nenhum'}
${protocolContext ? `- Contexto do Protocolo: ${protocolContext}` : ''}

MENSAGEM DO PACIENTE:
"${patientMessage}"

INSTRUÇÕES:
1. Se a mensagem for um check-in de gamificação (A/B/C, peso, etc.), extraia os dados e confirme.
2. Se for uma pergunta simples, responda de forma empática.
3. Se for algo que requer atenção médica, escale para a equipe.

Responda em JSON...
  `;

  const result = await ai.generate({
    model: gemini15Flash,
    prompt,
    output: {
      schema: GenerateChatbotReplyOutputSchema,
    },
  });

  return result.output;
}
```

**Função:** Usa o Gemini para gerar respostas automáticas do chatbot, decidindo entre responder ou escalar para humanos.

#### 3.1.2 Resumo de Paciente

```typescript
// src/ai/flows/generate-patient-summary.ts
export async function generatePatientSummary(input: GeneratePatientSummaryInput): Promise<PatientSummary> {
  const { patientId } = input;
  
  // Busca dados do paciente
  const { patient, conversation, metrics } = await getPatientDetails(patientId);
  
  const prompt = `
Analise os dados do paciente e gere um resumo executivo...

DADOS DO PACIENTE:
${JSON.stringify(patient, null, 2)}

HISTÓRICO DE CONVERSAS:
${conversation.map(m => `${m.sender}: ${m.text}`).join('\n')}

MÉTRICAS DE SAÚDE:
${JSON.stringify(metrics, null, 2)}

Gere um resumo com:
- Status geral (on_track, stagnated, needs_attention, critical)
- Resumo de 2-3 frases
- 2-3 pontos positivos
- 2-3 pontos de atenção
- Recomendação clara
  `;

  const result = await ai.generate({
    model: gemini15Flash,
    prompt,
    output: { schema: PatientSummarySchema },
  });

  return result.output;
}
```

**Função:** Analisa dados do paciente e gera resumo executivo para a equipe médica.

---

## 💬 4. Integração com WhatsApp (Twilio)

### 4.1 Configuração Twilio (`src/lib/twilio.ts`)

```typescript
import twilio from 'twilio';

export async function getTwilioCredentials(): Promise<TwilioCredentials | null> {
  // Tenta buscar do Firestore primeiro
  const db = getDb();
  const credDoc = await db.collection('system_config').doc('twilio_credentials').get();
  
  if (credDoc.exists) {
    return credDoc.data() as TwilioCredentials;
  }
  
  // Fallback para variáveis de ambiente
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    };
  }
  
  return null;
}

export async function sendWhatsappMessage(to: string, message: string): Promise<boolean> {
  const credentials = await getTwilioCredentials();
  
  if (!credentials) {
    console.error('Twilio credentials not configured');
    return false;
  }
  
  const client = twilio(credentials.accountSid, credentials.authToken);
  
  try {
    await client.messages.create({
      from: credentials.phoneNumber,
      to: to,
      body: message,
    });
    
    console.log(`✅ WhatsApp message sent to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return false;
  }
}

export function validateTwilioWebhook(request: NextRequest, body: any): boolean {
  const signature = request.headers.get('x-twilio-signature');
  
  if (!signature) return false;
  
  const credentials = await getTwilioCredentials();
  if (!credentials) return false;
  
  const url = request.url;
  
  return twilio.validateRequest(
    credentials.authToken,
    signature,
    url,
    body
  );
}
```

**Função:** Gerencia credenciais Twilio e envia/valida mensagens WhatsApp.

### 4.2 Webhook do WhatsApp (`src/app/api/whatsapp/route.ts`)

```typescript
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());

    // Valida que a requisição veio do Twilio
    const isTwilioRequest = validateTwilioWebhook(request, body);
    if (!isTwilioRequest) {
      return new NextResponse('Invalid Twilio Signature', { status: 401 });
    }
    
    const from = body.From as string; // whatsapp:+5511999990001
    const message = body.Body as string;
    const profileName = body.ProfileName as string;
    
    // IMPORTANTE: Não aguarda! Responde imediatamente ao Twilio
    // e processa em background para evitar timeout
    handlePatientReply(from, message, profileName || 'Novo Contato');

    // Responde com TwiML vazio
    const twiml = new twilio.twiml.MessagingResponse();
    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error processing Twilio webhook:", error);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 500 });
  }
}
```

**Função:** Recebe mensagens do WhatsApp via webhook do Twilio e processa em background.

---

## 🗄️ 5. Operações do Firestore

### 5.1 Principais Funções (`src/ai/firestore-admin.ts`)

#### 5.1.1 Processar Resposta do Paciente

```typescript
export async function handlePatientReply(
  patientPhone: string, 
  patientMessage: string, 
  patientName: string
) {
  const db = getDb();
  const normalizedPhone = normalizeBrazilianNumber(patientPhone);
  
  // 1. Buscar ou criar paciente
  const patientsSnapshot = await db.collection('patients')
    .where('whatsappNumber', '==', normalizedPhone)
    .limit(1)
    .get();
  
  let patientId: string;
  let patient: Patient;
  
  if (patientsSnapshot.empty) {
    // Criar novo paciente
    patientId = await createNewPatient(normalizedPhone, patientName, patientMessage);
    const patientDoc = await db.collection('patients').doc(patientId).get();
    patient = { id: patientId, ...patientDoc.data() } as Patient;
  } else {
    const patientDoc = patientsSnapshot.docs[0];
    patientId = patientDoc.id;
    patient = { id: patientId, ...patientDoc.data() } as Patient;
  }
  
  // 2. Adicionar mensagem ao histórico
  await addMessage(patientId, { sender: 'patient', text: patientMessage });
  
  // 3. Buscar contexto do protocolo
  let protocolContext = '';
  if (patient.protocol?.isActive) {
    const protocolDoc = await db.collection('protocols').doc(patient.protocol.protocolId).get();
    if (protocolDoc.exists) {
      const protocol = protocolDoc.data() as Protocol;
      const todayStep = protocol.messages.find(m => m.day === patient.protocol!.currentDay);
      if (todayStep) {
        protocolContext = `Última mensagem do protocolo (dia ${patient.protocol.currentDay}): "${todayStep.message}"`;
      }
    }
  }
  
  // 4. Gerar resposta com IA
  const aiResponse = await generateChatbotReply({
    patient,
    patientMessage,
    protocolContext,
  });
  
  // 5. Processar decisão da IA
  if (aiResponse.decision === 'escalate') {
    // Escalar para humano
    await db.collection('patients').doc(patientId).update({
      needsAttention: true,
      attentionRequest: aiResponse.attentionRequest,
    });
    
    // Enviar mensagem de escalação
    if (aiResponse.chatbotReply) {
      await sendWhatsappMessage(normalizedPhone, aiResponse.chatbotReply);
      await addMessage(patientId, { sender: 'me', text: aiResponse.chatbotReply });
    }
  } else {
    // Responder automaticamente
    if (aiResponse.chatbotReply) {
      await sendWhatsappMessage(normalizedPhone, aiResponse.chatbotReply);
      await addMessage(patientId, { sender: 'me', text: aiResponse.chatbotReply });
    }
    
    // Processar dados extraídos (peso, check-ins, etc.)
    if (aiResponse.extractedData) {
      await addHealthMetric(patientId, aiResponse.extractedData);
      await updateGamificationProgress(patientId, aiResponse.extractedData);
    }
  }
  
  // 6. Atualizar timestamp da última mensagem
  await db.collection('patients').doc(patientId).update({
    lastMessage: patientMessage,
    lastMessageTimestamp: new Date(),
  });
}
```

**Função:** Processa mensagens recebidas do WhatsApp, usa IA para decidir resposta e atualiza dados do paciente.

#### 5.1.2 Processar Fila de Mensagens Agendadas

```typescript
export async function processMessageQueue(): Promise<{ success: boolean, processedCount: number, error?: string }> {
  const db = getDb();
  const now = new Date();
  
  // Buscar mensagens pendentes que devem ser enviadas
  const messagesSnapshot = await db.collection('scheduled_messages')
    .where('status', '==', 'pending')
    .where('sendAt', '<=', now)
    .orderBy('sendAt', 'asc')
    .limit(50)
    .get();
  
  let processedCount = 0;
  
  for (const messageDoc of messagesSnapshot.docs) {
    const message = messageDoc.data() as ScheduledMessage;
    
    try {
      // Enviar mensagem
      const sent = await sendWhatsappMessage(
        message.patientWhatsappNumber,
        message.messageContent
      );
      
      if (sent) {
        // Marcar como enviada
        await messageDoc.ref.update({
          status: 'sent',
          sentAt: new Date(),
        });
        
        // Adicionar ao histórico
        await addMessage(message.patientId, {
          sender: 'me',
          text: message.messageContent,
        });
        
        processedCount++;
      } else {
        // Marcar como erro
        await messageDoc.ref.update({
          status: 'error',
          errorInfo: 'Failed to send via Twilio',
        });
      }
    } catch (error: any) {
      console.error(`Error processing message ${messageDoc.id}:`, error);
      await messageDoc.ref.update({
        status: 'error',
        errorInfo: error.message,
      });
    }
    
    // Delay para evitar rate limiting
    await sleep(1000);
  }
  
  return { success: true, processedCount };
}
```

**Função:** Processa fila de mensagens agendadas (protocolos, lembretes) e envia via WhatsApp.

#### 5.1.3 Atribuir Protocolo a Paciente

```typescript
export async function assignProtocolToPatient(
  patientId: string, 
  protocolId: string, 
  weightGoal: number | null
): Promise<{ success: boolean, error?: string }> {
  const db = getDb();
  
  // 1. Buscar protocolo
  const protocolDoc = await db.collection('protocols').doc(protocolId).get();
  if (!protocolDoc.exists) {
    return { success: false, error: 'Protocolo não encontrado' };
  }
  
  const protocol = protocolDoc.data() as Protocol;
  
  // 2. Combinar mensagens de conteúdo com gamificação obrigatória
  const allMessages = [...protocol.messages, ...mandatoryGamificationSteps]
    .sort((a, b) => a.day - b.day);
  
  // 3. Agendar todas as mensagens
  const startDate = new Date();
  
  for (const step of allMessages) {
    const sendAt = add(startDate, { days: step.day - 1 });
    
    await scheduleMessage(
      patientId,
      patient.whatsappNumber,
      step.message,
      sendAt,
      'protocol'
    );
  }
  
  // 4. Atualizar paciente
  await db.collection('patients').doc(patientId).update({
    protocol: {
      protocolId,
      startDate: startDate.toISOString(),
      currentDay: 1,
      isActive: true,
      weightGoal,
    },
  });
  
  return { success: true };
}
```

**Função:** Atribui protocolo a paciente e agenda todas as mensagens (conteúdo + gamificação).

---

## 🎮 6. Sistema de Gamificação

### 6.1 Atualização de Progresso

```typescript
export async function updateGamificationProgress(
  patientId: string, 
  extractedData: ExtractPatientDataOutput
) {
  const db = getDb();
  const patientDoc = await db.collection('patients').doc(patientId).get();
  const patient = patientDoc.data() as Patient;
  
  let pointsEarned = 0;
  let perspective: Perspective | null = null;
  
  // Identificar ação e perspectiva
  if (extractedData.weight) {
    const action = gamificationConfig.actions.find(a => a.actionId === 'medicao_semanal');
    if (action) {
      pointsEarned = action.points as number;
      perspective = action.perspective;
    }
  } else if (extractedData.mealCheckin) {
    const action = gamificationConfig.actions.find(a => a.actionId === 'check_in_refeicao');
    if (action) {
      pointsEarned = (action.points as Record<string, number>)[extractedData.mealCheckin];
      perspective = action.perspective;
    }
  }
  // ... mais verificações
  
  if (pointsEarned > 0 && perspective) {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    
    // Atualizar progresso semanal
    const currentProgress = patient.gamification.weeklyProgress.perspectives[perspective].current;
    const newProgress = Math.min(
      currentProgress + 1,
      gamificationConfig.perspectiveGoals[perspective]
    );
    
    await db.collection('patients').doc(patientId).update({
      'gamification.totalPoints': patient.gamification.totalPoints + pointsEarned,
      [`gamification.weeklyProgress.perspectives.${perspective}.current`]: newProgress,
      [`gamification.weeklyProgress.perspectives.${perspective}.isComplete`]: 
        newProgress >= gamificationConfig.perspectiveGoals[perspective],
    });
  }
}
```

**Função:** Atualiza pontos e progresso semanal de gamificação baseado em check-ins.

---

## 🌐 7. Rotas e Páginas

### 7.1 Página de Login (`src/app/page.tsx`)

```typescript
export default function RootPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && userProfile) {
      router.replace('/dashboard');
    }
  }, [user, userProfile, loading, router]);
  
  if (loading || (user && userProfile)) {
    return <div>Carregando...</div>;
  }
  
  return (
    <Card>
      <Tabs defaultValue="login">
        <TabsList>
          <TabsTrigger value="login">Entrar</TabsTrigger>
          <TabsTrigger value="register">Criar Conta</TabsTrigger>
        </TabsList>
        
        <TabsContent value="login">
          <LoginForm />
        </TabsContent>
        
        <TabsContent value="register">
          <Tabs defaultValue="staff">
            <TabsTrigger value="staff">Sou da Equipe</TabsTrigger>
            <TabsTrigger value="patient">Sou Paciente</TabsTrigger>
            
            <TabsContent value="staff">
              <RegisterForm userType="staff" />
            </TabsContent>
            
            <TabsContent value="patient">
              <RegisterForm userType="patient" />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
```

**Função:** Página de login/registro com tabs para equipe e pacientes.

### 7.2 Roteador Central (`src/app/dashboard/page.tsx`)

```typescript
export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (loading) return;
    
    if (!user || !userProfile) {
      router.replace('/');
      return;
    }

    // Redirecionar baseado no perfil
    if (userProfile.role === 'paciente') {
      router.replace('/portal/welcome');
    } else if (userProfile.role !== 'pendente') {
      router.replace('/overview');
    }
    // Se pendente, mostra tela de espera
  }, [loading, user, userProfile, router]);
  
  // Tela de espera para usuários pendentes
  if (!loading && userProfile?.role === 'pendente') {
    return (
      <Card>
        <CardHeader>
          <Clock />
          <CardTitle>Cadastro em Análise</CardTitle>
          <CardDescription>
            Sua conta está aguardando aprovação de um administrador.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={logout}>Sair</Button>
        </CardFooter>
      </Card>
    );
  }
  
  return <div>Redirecionando...</div>;
}
```

**Função:** Roteador central que direciona usuários para a tela correta baseado no perfil.

### 7.3 Lista de Pacientes (`src/app/(dashboard)/patients/page.tsx`)

```typescript
export default function PatientsListPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('attention');
  
  useEffect(() => {
    const fetchPatients = async () => {
      const fetchedPatients = await getPatients();
      setPatients(fetchedPatients);
    };
    
    if (!authLoading && user) {
      fetchPatients();
    }
  }, [user, authLoading]);
  
  const filteredPatients = useMemo(() => {
    return patients
      .filter(patient => {
        if (activeTab === 'attention') return patient.needsAttention && patient.status !== 'pending';
        if (activeTab === 'pending') return patient.status === 'pending';
        return true; // 'all' tab
      })
      .filter(patient => patient.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        // Ordenar por prioridade e tempo
        const priorityA = a.attentionRequest?.priority || a.subscription.priority || 1;
        const priorityB = b.attentionRequest?.priority || b.subscription.priority || 1;
        return priorityB - priorityA;
      });
  }, [patients, activeTab, searchTerm]);
  
  return (
    <div>
      <Tabs defaultValue="attention" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="attention">
            Fila de Atenção
            {attentionCount > 0 && <Badge>{attentionCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pendentes
            {pendingCount > 0 && <Badge>{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
        
        <Input 
          placeholder="Pesquisar por nome..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map(patient => (
            <Link href={`/patient/${patient.id}`} key={patient.id}>
              <Card>
                <Avatar>
                  <AvatarImage src={patient.avatar} />
                  <AvatarFallback>{patient.name[0]}</AvatarFallback>
                </Avatar>
                
                <h3>{patient.name}</h3>
                <Badge>{patient.subscription.plan}</Badge>
                
                {patient.attentionRequest && (
                  <div className="bg-amber-50 border-l-4 border-amber-400">
                    <p>{patient.attentionRequest.reason}</p>
                    <p>"{patient.attentionRequest.triggerMessage}"</p>
                  </div>
                )}
                
                <p>"{patient.lastMessage}"</p>
                <span>{formatDistanceToNow(new Date(patient.lastMessageTimestamp))}</span>
              </Card>
            </Link>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
```

**Função:** Lista pacientes com filtros (atenção, pendentes, todos) e busca.

---

## ⏰ 8. Cron Jobs

### 8.1 Endpoint de Cron (`src/app/api/cron/route.ts`)

```typescript
export async function GET(request: NextRequest) {
  // 1. Verificação de segurança
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 2. Processar fila de mensagens
  const queueResult = await processMessageQueue();
  console.log(`[CRON] ${queueResult.processedCount} mensagens enviadas`);

  // 3. Processar check-ins perdidos
  const checkinResult = await processMissedCheckins();
  console.log(`[CRON] ${checkinResult.processedCount} lembretes enviados`);

  return NextResponse.json({
    success: true,
    processedMessages: queueResult.processedCount,
    processedMissedCheckins: checkinResult.processedCount
  });
}
```

**Função:** Endpoint chamado pelo Google Cloud Scheduler a cada 10 minutos para processar mensagens agendadas.

---

## 🎨 9. Componentes UI

### 9.1 Layout do Dashboard (`src/components/AppLayout.tsx`)

```typescript
export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, userProfile, logout } = useAuth();

  const menuItems = allMenuItems.filter(item => 
    userProfile?.role && item.roles.includes(userProfile.role)
  );

  const isAdmin = userProfile?.role === 'medico_dono';

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <CuidarMeLogo />
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <UserCog />
                    <span>Admin</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Gestão de Equipe</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/settings">Credenciais</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarMenu>
        </SidebarContent>
        
        <SidebarFooter>
          <Avatar>
            <AvatarImage src={user?.photoURL ?? undefined} />
            <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <span>{user?.displayName}</span>
            <span>{user?.email}</span>
            <Badge>{roleLabels[userProfile.role]}</Badge>
          </div>
          <Button onClick={logout}>
            <LogOut />
          </Button>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
```

**Função:** Layout principal do dashboard com sidebar responsiva e menu baseado em permissões.

---

## 📊 10. Fluxo Completo de Dados

### 10.1 Fluxo de Mensagem do WhatsApp

```
1. Paciente envia mensagem no WhatsApp
   ↓
2. Twilio recebe e envia webhook para /api/whatsapp
   ↓
3. Webhook valida assinatura do Twilio
   ↓
4. handlePatientReply() é chamado (não aguardado)
   ↓
5. Busca ou cria paciente no Firestore
   ↓
6. Adiciona mensagem ao histórico
   ↓
7. Busca contexto do protocolo ativo
   ↓
8. Chama IA (Gemini) para gerar resposta
   ↓
9. IA decide: responder ou escalar?
   ├─ Responder: Envia mensagem automática
   └─ Escalar: Marca needsAttention = true
   ↓
10. Extrai dados estruturados (peso, check-ins)
   ↓
11. Atualiza gamificação
   ↓
12. Atualiza timestamp da última mensagem
```

### 10.2 Fluxo de Atribuição de Protocolo

```
1. Admin seleciona protocolo para paciente
   ↓
2. assignProtocolToPatient() é chamado
   ↓
3. Busca protocolo no Firestore
   ↓
4. Combina mensagens de conteúdo + gamificação obrigatória
   ↓
5. Ordena por dia
   ↓
6. Para cada mensagem:
   ├─ Calcula data de envio (startDate + dias)
   └─ Cria documento em scheduled_messages
   ↓
7. Atualiza paciente com protocolo ativo
   ↓
8. Cron job processa fila a cada 10 minutos
   ↓
9. Mensagens são enviadas no horário correto
```

### 10.3 Fluxo de Gamificação

```
1. Paciente responde check-in (ex: "A")
   ↓
2. IA extrai dados estruturados
   ↓
3. updateGamificationProgress() identifica ação
   ↓
4. Calcula pontos baseado em gamificationConfig
   ↓
5. Identifica perspectiva (alimentacao, movimento, etc.)
   ↓
6. Atualiza progresso semanal da perspectiva
   ↓
7. Adiciona pontos ao total
   ↓
8. Verifica se completou meta semanal
   ↓
9. Se completou todas as perspectivas:
   └─ Desbloqueia badge
```

---

## 🔒 11. Segurança

### 11.1 Autenticação

- **Firebase Authentication** para login/registro
- **Session Cookies HTTP-only** para segurança
- **Validação de token** em todas as Server Actions
- **Roles e permissões** baseadas em UserRole

### 11.2 API Routes

- **Validação de assinatura Twilio** em webhooks
- **CRON_SECRET** para proteger endpoint de cron
- **Verificação de sessão** antes de operações sensíveis

### 11.3 Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Apenas usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Usuários só podem ler/editar seu próprio perfil
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Apenas admins podem gerenciar protocolos
    match /protocols/{protocolId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'medico_dono';
    }
  }
}
```

---

## 🚀 12. Deploy e Configuração

### 12.1 Variáveis de Ambiente

```env
# Firebase Client (NEXT_PUBLIC_ = acessível no navegador)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (servidor apenas)
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=...

# Twilio (opcional, pode ser configurado via UI)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=whatsapp:+14155238886

# Cron Job
CRON_SECRET=CuidarMeCronSecret123
```

### 12.2 Configuração do Twilio

1. **Sandbox (Desenvolvimento):**
   - Console Twilio > Messaging > Try it out > Send a WhatsApp message
   - Sandbox Settings > When a message comes in: `https://seu-dominio.com/api/whatsapp`
   - Método: HTTP POST

2. **Produção (Número próprio):**
   - Console Twilio > Phone Numbers > Active Numbers
   - Selecionar número > Messaging Configuration
   - A MESSAGE COMES IN: `https://seu-dominio.com/api/whatsapp`
   - Método: HTTP POST

### 12.3 Configuração do Cron Job (Google Cloud Scheduler)

1. Google Cloud Console > Cloud Scheduler
2. Create Job:
   - Name: `process-message-queue`
   - Frequency: `*/10 * * * *` (a cada 10 minutos)
   - Target type: HTTP
   - URL: `https://seu-dominio.com/api/cron`
   - HTTP method: GET
   - Headers:
     - Authorization: `Bearer CuidarMeCronSecret123`

---

## 📈 13. Métricas e Monitoramento

### 13.1 Logs Importantes

```typescript
// Logs de mensagens WhatsApp
console.log(`✅ WhatsApp message sent to ${to}`);
console.error('❌ Error sending WhatsApp message:', error);

// Logs de IA
console.log('[AI] Generating chatbot reply for patient:', patientId);
console.log('[AI] Decision:', decision, 'Reply:', chatbotReply);

// Logs de Cron
console.log('[CRON] Iniciando processamento da fila de mensagens...');
console.log(`[CRON] ${processedCount} mensagens enviadas`);

// Logs de Firebase
console.log('🔥 Initializing Firebase Admin GLOBALLY...');
console.log('✅ Firebase Admin initialized GLOBALLY');
```

### 13.2 Métricas Chave

- **Taxa de resposta automática vs escalação**
- **Tempo médio de resposta**
- **Engajamento em check-ins de gamificação**
- **Taxa de conclusão de protocolos**
- **Pacientes que precisam de atenção**

---

## 🎯 14. Principais Funcionalidades

### ✅ Implementadas

1. **Autenticação completa** (Firebase Auth + Session Cookies)
2. **Sistema de roles** (medico_dono, equipe_saude, assistente, paciente, pendente)
3. **Integração WhatsApp** (Twilio + webhooks)
4. **Chatbot com IA** (Google Gemini)
5. **Protocolos de 90 dias** (Fundamentos, Evolução, Performance)
6. **Gamificação completa** (5 perspectivas, pontos, badges, progresso semanal)
7. **Mensagens agendadas** (fila + cron job)
8. **Gestão de pacientes** (lista, detalhes, edição)
9. **Gestão de equipe** (aprovação, roles)
10. **Biblioteca de vídeos educativos**
11. **Comunidade MVP** (tópicos, comentários, reações)
12. **Campanhas de mensagens em massa**
13. **Dashboard com métricas**
14. **Resumo de paciente com IA**

### 🔄 Fluxos Principais

1. **Novo paciente via WhatsApp** → Criação automática → Boas-vindas
2. **Atribuição de protocolo** → Agendamento de mensagens → Envio automático
3. **Check-in de gamificação** → Extração de dados → Atualização de pontos
4. **Mensagem que requer atenção** → IA escala → Equipe responde
5. **Aprovação de cadastro** → Mudança de role → Acesso liberado

---

## 🛠️ 15. Tecnologias Utilizadas

- **Frontend:** Next.js 14, React 18, TypeScript
- **UI:** shadcn/ui, Radix UI, Tailwind CSS
- **Backend:** Next.js Server Actions, Firebase Admin SDK
- **Banco de Dados:** Firestore
- **Autenticação:** Firebase Authentication
- **IA:** Google Gemini (via Genkit)
- **WhatsApp:** Twilio API
- **Agendamento:** Google Cloud Scheduler
- **Deploy:** Firebase Hosting / Vercel

---

## 📝 16. Padrões de Código

### 16.1 Nomenclatura

- **Componentes:** PascalCase (`PatientList`, `AppLayout`)
- **Funções:** camelCase (`getPatients`, `handlePatientReply`)
- **Tipos:** PascalCase (`Patient`, `UserProfile`)
- **Constantes:** UPPER_SNAKE_CASE (`SESSION_COOKIE_NAME`)

### 16.2 Estrutura de Arquivos

- **Server Actions:** `src/ai/actions.ts`
- **Operações Firestore:** `src/ai/firestore-admin.ts`
- **Fluxos de IA:** `src/ai/flows/*.ts`
- **Páginas:** `src/app/(dashboard)/*/page.tsx`
- **Componentes:** `src/components/*.tsx`
- **Hooks:** `src/hooks/use-*.tsx`
- **Tipos:** `src/lib/types.ts`

### 16.3 Boas Práticas

- **Server Actions** para todas as operações do servidor
- **TypeScript** para type-safety
- **Error handling** com try/catch e logs
- **Validação** de dados de entrada
- **Otimização** com useMemo e useCallback
- **Responsividade** mobile-first

---

## 🎓 17. Conceitos Avançados

### 17.1 Server Actions

```typescript
'use server';

export async function getPatients(): Promise<Patient[]> {
  const db = getDb();
  const snapshot = await db.collection('patients').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
}
```

**Vantagens:**
- Código do servidor no mesmo arquivo
- Type-safe end-to-end
- Sem necessidade de API routes separadas

### 17.2 Genkit para IA

```typescript
const result = await ai.generate({
  model: gemini15Flash,
  prompt: '...',
  output: { schema: ZodSchema },
});
```

**Vantagens:**
- Validação automática com Zod
- Type-safe outputs
- Fácil troca de modelos

### 17.3 Firebase Admin Global

```typescript
const globalForFirebase = globalThis as unknown as {
  firebaseAdmin: admin.app.App | undefined;
};
```

**Vantagens:**
- Evita reinicializações em hot-reload
- Performance melhorada
- Menos erros em desenvolvimento

---

## 🔍 18. Debugging e Troubleshooting

### 18.1 Problemas Comuns

**1. Firebase Admin não inicializa:**
- Verificar variáveis de ambiente (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)
- Verificar formato da PRIVATE_KEY (deve ter \n escapados)

**2. Twilio não envia mensagens:**
- Verificar credenciais (accountSid, authToken, phoneNumber)
- Verificar formato do número (whatsapp:+5511999990001)
- Verificar webhook configurado corretamente

**3. IA não responde:**
- Verificar API key do Gemini
- Verificar schema Zod do output
- Verificar logs de erro

**4. Mensagens não são agendadas:**
- Verificar se protocolo foi atribuído corretamente
- Verificar cron job está rodando
- Verificar fila de mensagens no Firestore

### 18.2 Ferramentas de Debug

```typescript
// Logs detalhados
console.log('[DEBUG] Patient:', JSON.stringify(patient, null, 2));

// Verificar estado do Firebase
console.log('Firebase Admin initialized:', !!globalForFirebase.firebaseAdmin);

// Verificar sessão
const uid = await getCurrentUserId();
console.log('Current user ID:', uid);
```

---

## 🎉 Conclusão

O **Cuidar.me** é um sistema completo e robusto de acompanhamento de pacientes com:

- ✅ Arquitetura moderna e escalável
- ✅ Integração completa com IA
- ✅ Automação de mensagens via WhatsApp
- ✅ Gamificação engajadora
- ✅ Segurança robusta
- ✅ Code bem estruturado e type-safe

Este documento cobre **todos os aspectos principais** do código, desde autenticação até deploy. Use-o como referência para entender, modificar ou expandir o sistema.

---

**Última atualização:** 2025-11-24
**Versão do Next.js:** 14.2.4
**Versão do Firebase:** 11.9.1
