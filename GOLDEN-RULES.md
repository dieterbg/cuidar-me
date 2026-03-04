# 🌟 Cuidar.me: Regras de Ouro (Golden Rules)

Este documento compila as definições imutáveis do produto **Cuidar.me**. Ele serve como a **"Bíblia" do projeto**, ditando as regras de planos de assinatura, monetização, perfis psicológicos dos pacientes e o tom de voz da IA em cada Protocolo.

Nenhuma funcionalidade técnica ou regra de negócio nova deve contradizer os princípios estabelecidos aqui.

---

## 💎 PARTE 1: Os Planos de Assinatura (Tiers)

O Cuidar.me possui exatamente 3 níveis de assinatura. O produto é desenhado para maximizar a conversão (*Upsell*) do nível gratuito para os níveis pagos, criando gatilhos de limitação bem definidos.

### 1. Plano Freemium (Gratuito)
* **Objetivo:** Aquisição massiva e captura do Lead (WhatsApp).
* **O que o paciente tem direito:**
  * Cadastro rápido via IA (Nome e Peso).
  * Receber 1 "Dica Diária" genérica (via cron job).
* **O Limite de Fricção (O Gatilho de Upsell):**
  * O paciente Freemium pode mandar até **5 mensagens por dia**.
  * Sempre que o paciente mandar uma mensagem perguntando algo à IA (dieta, treino, conselho), a IA entra em modo "vendedor" e dispara o **Freemium Gate**, informando que respostas personalizadas são exclusivas do Premium, impedindo a interação contínua.
  * **Regra de Ouro:** Freemium **NÃO PODE** ser atribuído a nenhum Protocolo Interativo ou de Gamificação.

### 2. Plano Premium (Pago)
* **Objetivo:** Retenção, Educação e Mudança de Comportamento.
* **O que o paciente tem direito:**
  * Bate-papo liberado com a IA (Consultor 24h) com limite alto de **30 mensagens/dia** (evitar abusos).
  * Acesso completo aos **Protocolos Clínicos** de acompanhamento e Gamificação.
  * Captura de dados de Saúde (Peso Mensal/Semanal, Alimentação, Água, Sono) diretamente no Dashboard.
* **O Limite de Fricção:**
  * Interações apenas via Texto ou Áudio com o robô.
  * Não tem prioridade máxima médica.

### 3. Plano VIP (High-Ticket)
* **Objetivo:** Ticket médio alto, Hiper-personalização e Suporte Humano.
* **O que o paciente tem direito:**
  * Tudo do Premium.
  * **Chat Ilimitado** (∞ mensagens/dia).
  * Respostas prioritárias (Bypass de fila).
  * **Intervenção Humana:** A equipe médica real pode ler e intervir na conversa do paciente a qualquer momento.

---

## 📋 PARTE 2: Os Protocolos Clínicos (A Jornada do Herói)

Os Protocolos são trilhas temporais (ex: 30 ou 90 dias) que enviam testes e perguntas ativamente ao paciente (Check-ins).
A jornada Cuidar.me é um funil evolutivo: `Fundamentos ➔ Evolução ➔ Performance`.

### 🌱 Nível 1: Protocolo Fundamentos
**Onde a jornada começa.**
* **Duração:** 30 a 90 Dias.
* **A Metáfora:** "Limpando o terreno e plantando as primeiras sementes."
* **O Paciente Ideal (Persona):** Sedentário(a), com sobrepeso/obesidade, sente-se sobrecarregado(a) de conteúdo na internet e precisa de vitórias rápidas e fáceis.
* **O Foco (Lead Indicators):** Hidratação e 1 refeição limpa no dia (não exigir perfeição em todas). Caminhadas muito leves.
* **O Tom de Voz da IA:** Acolhedor, perdoador, encorajador (Modo Maternal/Paternal). *"Tropeçou hoje? Tudo bem! Amanhã tentamos de novo."*
* **A Gamificação:** Recompensa alta por tarefas fáceis. O paciente ganha muitos pontos só por beber água, gerando dopamina barata para fixar o hábito inicial.

### 📈 Nível 2: Protocolo Evolução
**Transformando hábitos em estilo de vida.**
* **Duração:** 90 Dias.
* **A Metáfora:** "Cuidando do jardim e podando os excessos."
* **O Paciente Ideal (Persona):** Já saiu da inércia, mas sofre com o "efeito sanfona" (escorrega ferozmente nos finais de semana). Sabe *o que* tem que fazer, mas erra no *como* focar a longo prazo.
* **O Foco (Lead Indicators):** Qualidade sistêmica do prato, treino regular (3x a 4x/semana), rotina de sono e hidratação total.
* **O Tom de Voz da IA:** Parceria intelectual, modo professor. Explica o **porquê** das coisas. *"Em vez de proibir o delivery, vamos de exceção inteligente?"*
* **A Gamificação:** Dificuldade média. Exige 'combos' (Dias Seguidos) para ganhar mais pontos e construir consistência real.

### 🔥 Nível 3: Protocolo Performance
**O Refinamento e a Alta Performance.**
* **Duração:** 90 Dias.
* **A Metáfora:** "Esculpindo a obra de arte."
* **O Paciente Ideal (Persona):** Focado, competitivo consigo mesmo, atingiu um platô ou quer reduzir gordura para percentuais estéticos mais exigentes.
* **O Foco (Lead Indicators):** Metas exatas de macronutrientes, treino de alta intensidade (5x+/semana), sono profundo focado em recuperação máxima.
* **O Tom de Voz da IA:** Treinador de Elite (Coach Esportivo). Direto, focado em responsabilidade pessoal, sem desculpas, rigoroso mas comemora efusivamente a quebra de recordes. *"Faltaram 30g de proteína hoje. Prometeu e não entregou. Amanhã vamos bater a meta, sem choro."*
* **A Gamificação:** Modo Hard. Perde pontuação ou as ofensivas muito rapidamente ao falhar. Distribui símbolos de "Status/Medalhas" por semanas 100% perfeitas.

---

## 🎁 PARTE 3: O Sistema de Gamificação e Recompensas

A gamificação é o motor de retenção do **Cuidar.me**. O objetivo não é apenas dar pontos, mas criar a falácia do custo irrecuperável (*sunk cost fallacy*) e recompensar financeiramente/socialmente os pacientes que atingem longevidade no tratamento.

**A Matemática dos Pontos (A Economia do App):**
Através dos check-ins diários (água, sono, refeições, exercício), um paciente altamente disciplinado consegue farmar entre **80 a 100 pontos por dia**.
* **1 Mês Perfeito:** ~2.500 a 3.000 pontos.
* **1 Ciclo de Protocolo (90 Dias):** ~8.000 a 9.000 pontos.

### 🏆 Níveis de Recompensa (Tiers de Resgate)

Para gerar "Aha! Moments" ao longo dos meses e combater o abandono da dieta (o *churn* do mês 3), o aplicativo adota 4 Níveis Oficiais de Resgate:

#### 🥉 Nível Bronze (Desbravador)
* **Pontos Necessários:** 1.500 Pontos (~Metade do primeiro mês perfeito).
* **O Retorno Psicológico:** Provar ao paciente que o esforço diário gera frutos rapidamente.
* **Sugestões de Recompensa (Custo Zero):**
  * Desbloqueio de um E-book Premium (ex: "*30 Receitas Nutritivas Rápidas Cuidar.me*").
  * Um Badge (Ícone) de Bronze brilho no perfil do WhatsApp e no Dashboard.

#### 🥈 Nível Prata (Consistente)
* **Pontos Necessários:** 4.000 Pontos (~1 Mês e meio de dedicação forte).
* **O Retorno Psicológico:** A fase onde a maioria desiste da dieta tradicional. O prêmio aqui fortalece a "ancoragem" do hábito.
* **Sugestões de Recompensa (Custo Baixo):**
  * Acesso a uma Masterclass gravada fechada (ex: *"Como não furar a dieta no final de semana"*).
  * Cupom de Desconto de 10% a 15% em lojas de parceiros (Academias locais, lojas de suplementos, ou farmácias de manipulação).

#### 🥇 Nível Ouro (Atleta)
* **Pontos Necessários:** 8.000 Pontos (Concluir o Ciclo de 90 Dias com excelência).
* **O Retorno Psicológico:** Orgulho de pertencer. O paciente se torna um embaixador da marca.
* **Sugestões de Recompensa (Custo Físico/Presencial):**
  * Presente enviado para a casa do paciente: Uma **Camiseta Esportiva Exclusiva** (*"I Survived Cuidar.me Protocol"*) ou uma Garrafa/Squeeze Térmica de alta qualidade com o logo da clínica. Produto que ele usa na academia e vira outdoor gratuito.
  * *Upgrade Surpresa:* 15 minutos de Consultoria de alinhamento com a própria Médica Endocrinologista.

#### 💎 Nível Diamante (Lenda)
* **Pontos Necessários:** 15.000+ Pontos (Consistência ao longo de Semestres).
* **O Retorno Psicológico:** Fidelidade profunda. Paciente de longo prazo (LTV máximo).
* **Sugestões de Recompensa (Alto Impacto no LTV):**
  * Um **Livro Físico** surpresa enviado para casa (ex: "Hábitos Atômicos").
  * **50% de Desconto na renovação Anual do Plano Premium/VIP** (Isso barra a concorrência e o mantém pagando a assinatura pelo segundo ano).
### 🛡️ Mecânica Anti-Fraude (Rate Limiting)

Para proteger a economia do aplicativo (visto que os níveis Diamante geram custos reais para a clínica em prêmios/descontos), é obrigatória a existência de barreiras contra o "abuso de cliques" (*farm* de pontos) na plataforma Web.

**O Fator de Cansaço (Cooldown):**
* As respostas dadas passivamente via WhatsApp são inerentemente seguras, pois dependem de a IA enviar ativamente o *Check-in* (ex: 1x ao dia no Almoço).
* **Para ações ativadas manualmente no Dashboard (Botões Rápidos):** O sistema exige um intervalo mínimo (Cooldown) entre os cliques e um teto diário para que os botões voltem a pontuar, sob pena de notificar ao paciente: *"Você atingiu o limite de pontos manuais para esta ação hoje. Volte amanhã!"*. Isso educa o paciente a ter constância, não intensidade repentina.
