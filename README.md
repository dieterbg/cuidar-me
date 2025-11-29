# Cuidar.me - Plataforma de Gestão de Pacientes com IA

Plataforma completa de acompanhamento de pacientes com protocolo clínico personalizado, gamificação, comunicação via WhatsApp e análise por IA.

## 🚀 Stack Tecnológico

- **Framework:** Next.js 14 (App Router)
- **Linguagem:** TypeScript
- **Database:** Supabase (PostgreSQL + Realtime)
- **Autenticação:** Supabase Auth
- **IA/ML:** Google Genkit + Gemini AI
- **Mensagens:** Twilio (WhatsApp)
- **UI:** Tailwind CSS + shadcn/ui
- **Forms:** React Hook Form + Zod

---

## 📋 Pré-requisitos

- Node.js 20+ e npm
- Conta Supabase (gratuita)
- Conta Twilio (para WhatsApp)
- Google AI API Key (para Gemini)

---

## 🛠️ Configuração do Ambiente

### 1. Clonar o Repositório e Instalar Dependências

```bash
git clone <seu-repositorio>
cd Cuidar-me
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Google Gemini AI
GOOGLE_GENAI_API_KEY=sua-chave-google-ai

# Twilio (WhatsApp) - Opcional, pode ser configurado pela UI
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=seu_auth_token
TWILIO_PHONE_NUMBER=+14155238886

# Application
NEXT_PUBLIC_APP_URL=http://localhost:9002
```

### 3. Configurar Supabase

#### 3.1 Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Anote a **URL** e as **API Keys** (estão em Project Settings > API)

#### 3.2 Executar Migrações

Execute as migrações SQL na ordem:

```bash
# No dashboard do Supabase, vá em SQL Editor e execute os arquivos em:
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_manual_fix.sql
supabase/migrations/20251126_add_patient_profile_fields.sql
supabase/migrations/20251126_add_preferred_time.sql
supabase/migrations/20251126_daily_checkins.sql
supabase/migrations/20251126_lab_results.sql
supabase/migrations/20251126_onboarding_states.sql
```

#### 3.3 Configurar Row Level Security (RLS)

As migrações já incluem as políticas RLS necessárias. Verifique se estão ativas em:
- Database > Tables > Selecione cada tabela > RLS deve estar **Enabled**

---

## 📱 Configurar Twilio (WhatsApp)

### Opção A: Via Interface Admin (Recomendado)

1. Rode a aplicação: `npm run dev`
2. Faça login como admin
3. Navegue para **Admin > Credenciais**
4. Insira: Account SID, Auth Token e Phone Number
5. Salve (credenciais ficam criptografadas no Supabase)

### Opção B: Via Variáveis de Ambiente

Adicione ao `.env` (usado como fallback):

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=seu_auth_token
TWILIO_PHONE_NUMBER=+14155238886
```

### Configurar Webhook do Twilio

**Para Desenvolvimento (Sandbox):**

1. Acesse [Twilio Console](https://console.twilio.com)
2. Vá em **Messaging > Try it out > Send a WhatsApp message**
3. Clique em **Sandbox Settings**
4. Em "When a message comes in", insira: `https://seu-ngrok-url/api/whatsapp`
5. Método: `HTTP POST`
6. Salve

**Para Produção (Número Comprado):**

1. Vá em **Phone Numbers > Manage > Active numbers**
2. Selecione seu número
3. Em "Messaging Configuration", campo "A MESSAGE COMES IN":
   - URL: `https://seu-dominio.com/api/whatsapp`
   - Método: `HTTP POST`
4. Salve

---

## 🏃 Executar a Aplicação

### Modo Desenvolvimento

```bash
npm run dev
```

Acesse: `http://localhost:9002`

### Build de Produção

```bash
npm run build
npm start
```

---

## 👤 Criar Primeiro Usuário Admin

### Opção 1: Via Supabase Dashboard

1. Acesse o dashboard do Supabase
2. Vá em **Authentication > Users**
3. Clique em **Add user > Create new user**
4. Adicione email e senha
5. Vá na tabela `users` e defina `role = 'admin'` para esse usuário

### Opção 2: Via Script

```bash
npx tsx src/scripts/set-admin.ts seu-email@exemplo.com
```

---

## 📊 Seed do Banco de Dados (Opcional)

Para popular o banco com dados de teste:

```bash
npx tsx src/ai/seed-database.ts
```

Isso criará:
- Protocolos clínicos
- Configurações de gamificação
- Vídeos educacionais
- Tópicos da comunidade

---

## 🔐 Roles de Usuário

A aplicação suporta 4 tipos de usuários:

- **admin**: Acesso total ao sistema
- **equipe_saude**: Profissionais de saúde (visualização de pacientes)
- **assistente**: Suporte administrativo
- **paciente**: Pacientes do programa
- **pendente**: Usuário aguardando aprovação

---

## 📁 Estrutura do Projeto

```
Cuidar-me/
├── src/
│   ├── app/              # Rotas Next.js (App Router)
│   ├── components/       # Componentes React
│   ├── lib/              # Utilitários e configurações
│   ├── ai/               # Flows e Actions do Genkit
│   ├── hooks/            # React Hooks customizados
│   └── scripts/          # Scripts de manutenção
├── supabase/
│   └── migrations/       # Migrações SQL
├── docs/                 # Documentação do projeto
└── public/               # Arquivos estáticos
```

---

## 🎮 Funcionalidades Principais

### Para Pacientes
- ✅ Portal de cadastro e perfil
- ✅ Recebimento de mensagens via WhatsApp
- ✅ Sistema de gamificação (pontos, níveis, badges)
- ✅ Check-ins diários (alimentação, hidratação, exercícios)
- ✅ Comunidade anônima
- ✅ Vídeos educacionais

### Para Profissionais de Saúde
- ✅ Dashboard de pacientes
- ✅ Chat individual com histórico
- ✅ Análise de risco por IA
- ✅ Protocolos clínicos personalizados
- ✅ Sistema de tarefas e alertas
- ✅ Métricas e gráficos de progresso

### IA e Automação
- ✅ Chatbot inteligente (Gemini AI)
- ✅ Análise de conversas
- ✅ Extração automática de dados (peso, glicemia, etc.)
- ✅ Mensagens programadas
- ✅ Escalonamento automático para humanos

---

## 🔄 Como Adicionar Número Brasileiro para WhatsApp

O Twilio não permite compra direta de números móveis brasileiros. Use o processo **"Bring Your Own Number" (BYON)**:

### Passos:

1. **Adquira um número móvel brasileiro** (Vivo, Claro, TIM, etc.)
2. **Garantir que o número está "limpo":**
   - Não pode ter WhatsApp ativo
   - Se tiver, delete a conta: WhatsApp > Configurações > Conta > Deletar minha conta
3. **Registre no Twilio:**
   - Console Twilio > Messaging > WhatsApp Senders
   - Siga o processo de "Self-Sign-Up"
   - Conecte sua conta Meta Business Manager
4. **Verifique propriedade:**
   - Twilio enviará código via SMS/ligação
   - Insira o código recebido
5. **Configure webhook:**
   - Após aprovação, configure a URL: `https://seu-app.com/api/whatsapp`

---

## 🤖 Mensagens Automáticas (Cron Job)

A aplicação usa uma fila para enviar mensagens programadas. Configure um job periódico para processar a fila:

### Usando Google Cloud Scheduler (Grátis)

1. Acesse **Google Cloud Scheduler** no seu projeto
2. Clique em **Create Job**
3. Configure:
   - **Nome:** `process-message-queue`
   - **Frequência:** `*/10 * * * *` (a cada 10 minutos)
   - **Timezone:** Seu timezone
   - **Target:** HTTP
   - **URL:** `https://seu-app.com/api/cron`
   - **Método:** GET
   - **Header:** `Authorization: Bearer CuidarMeCronSecret123`
4. Salve

---

## 📚 Documentação Adicional

- [GAMIFICATION_ANALYSIS.md](./GAMIFICATION_ANALYSIS.md) - Análise completa do sistema de gamificação
- [PROTOCOL_CLINICAL_ANALYSIS.md](./PROTOCOL_CLINICAL_ANALYSIS.md) - Detalhes dos protocolos clínicos
- [CREDENCIAIS_SUPABASE.md](./CREDENCIAIS_SUPABASE.md) - Guia de configuração Supabase

---

## 🐛 Troubleshooting

### Build Errors

```bash
# Limpar cache do Next.js
rm -rf .next
npm run build
```

### Supabase Connection Issues

1. Verifique se as URL e Keys estão corretas no `.env`
2. Confirme que o projeto Supabase está ativo
3. Verifique se as tabelas foram criadas (migrações executadas)

### WhatsApp não recebe mensagens

1. Verifique webhook configurado corretamente no Twilio
2. Confirme que as credenciais estão salvas (Admin > Credenciais)
3. Verifique logs do Twilio Console

---

## 📄 Licença

Propriedade privada. Todos os direitos reservados.

---

## 💬 Suporte

Para dúvidas ou problemas, consulte a documentação em `/docs` ou entre em contato com a equipe de desenvolvimento.
