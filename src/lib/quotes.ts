export interface Quote {
    text: string;
    author: string;
    category?: 'stoicism' | 'health' | 'discipline' | 'motivation';
}

export const quotes: Quote[] = [
    // Stoicism
    { text: "A felicidade de sua vida depende da qualidade de seus pensamentos.", author: "Marco Aurélio", category: "stoicism" },
    { text: "Não é o que acontece com você, mas como você reage que importa.", author: "Epicteto", category: "stoicism" },
    { text: "Dificuldades fortalecem a mente, assim como o trabalho o corpo.", author: "Sêneca", category: "stoicism" },
    { text: "O homem conquista o mundo conquistando a si mesmo.", author: "Zenão de Cítio", category: "stoicism" },
    { text: "Sorte é o que acontece quando a preparação encontra a oportunidade.", author: "Sêneca", category: "stoicism" },
    { text: "Se você quer curar a humanidade, primeiro cure a si mesmo.", author: "Marco Aurélio", category: "stoicism" },
    { text: "Aquele que tem um porquê para viver pode suportar quase qualquer como.", author: "Friedrich Nietzsche", category: "stoicism" },
    { text: "Nenhum homem é livre se não for mestre de si mesmo.", author: "Epicteto", category: "stoicism" },
    { text: "A melhor vingança é ser diferente de quem causou o dano.", author: "Marco Aurélio", category: "stoicism" },
    { text: "Comece de onde você está. Use o que você tem. Faça o que você pode.", author: "Arthur Ashe", category: "stoicism" },

    // Health & Body
    { text: "Cuide do seu corpo. É o único lugar que você tem para viver.", author: "Jim Rohn", category: "health" },
    { text: "A saúde é a verdadeira riqueza, e não peças de ouro e prata.", author: "Mahatma Gandhi", category: "health" },
    { text: "O corpo humano é a melhor imagem da alma humana.", author: "Ludwig Wittgenstein", category: "health" },
    { text: "Aquele que tem saúde tem esperança; e aquele que tem esperança tem tudo.", author: "Provérbio Árabe", category: "health" },
    { text: "O exercício é rei. A nutrição é rainha. Junte os dois e você terá um reino.", author: "Jack LaLanne", category: "health" },
    { text: "Sua saúde é um investimento, não uma despesa.", author: "Desconhecido", category: "health" },
    { text: "Comer é uma necessidade, mas comer com inteligência é uma arte.", author: "La Rochefoucauld", category: "health" },
    { text: "O descanso é parte do treino.", author: "Desconhecido", category: "health" },
    { text: "A prevenção é melhor que a cura.", author: "Desidério Erasmo", category: "health" },
    { text: "Um exterior saudável começa por dentro.", author: "Robert Urich", category: "health" },

    // Discipline & Habits
    { text: "A disciplina é a ponte entre metas e realizações.", author: "Jim Rohn", category: "discipline" },
    { text: "Nós somos o que fazemos repetidamente. A excelência, portanto, não é um ato, mas um hábito.", author: "Aristóteles", category: "discipline" },
    { text: "A motivação é o que faz você começar. O hábito é o que faz você continuar.", author: "Jim Ryun", category: "discipline" },
    { text: "O segredo do seu futuro está escondido em sua rotina diária.", author: "Mike Murdock", category: "discipline" },
    { text: "Pequenas disciplinas repetidas com consistência todos os dias levam a grandes conquistas.", author: "John C. Maxwell", category: "discipline" },
    { text: "Não espere por inspiração. Torne-se disciplinado.", author: "Desconhecido", category: "discipline" },
    { text: "A dor da disciplina é temporária, mas a dor do arrependimento é eterna.", author: "Desconhecido", category: "discipline" },
    { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier", category: "discipline" },
    { text: "Primeiro fazemos nossos hábitos, depois nossos hábitos nos fazem.", author: "John Dryden", category: "discipline" },
    { text: "A constância é a chave para o sucesso.", author: "Desconhecido", category: "discipline" },

    // Motivation & Growth
    { text: "Acredite que você pode, e você já está no meio do caminho.", author: "Theodore Roosevelt", category: "motivation" },
    { text: "O único lugar onde o sucesso vem antes do trabalho é no dicionário.", author: "Vidal Sassoon", category: "motivation" },
    { text: "Não conte os dias, faça os dias contarem.", author: "Muhammad Ali", category: "motivation" },
    { text: "A jornada de mil milhas começa com um único passo.", author: "Lao Tsé", category: "motivation" },
    { text: "O que você faria se não tivesse medo?", author: "Desconhecido", category: "motivation" },
    { text: "Seja a mudança que você deseja ver no mundo.", author: "Mahatma Gandhi", category: "motivation" },
    { text: "Tudo o que você sempre quis está do outro lado do medo.", author: "George Addair", category: "motivation" },
    { text: "A persistência realiza o impossível.", author: "Provérbio Chinês", category: "motivation" },
    { text: "Não pare quando estiver cansado. Pare quando tiver terminado.", author: "Desconhecido", category: "motivation" },
    { text: "Você é mais forte do que imagina.", author: "Desconhecido", category: "motivation" },

    // More Stoicism & Wisdom
    { text: "Não desperdice mais tempo discutindo sobre o que um bom homem deve ser. Seja um.", author: "Marco Aurélio", category: "stoicism" },
    { text: "A riqueza não consiste em ter grandes posses, mas em ter poucas necessidades.", author: "Epicteto", category: "stoicism" },
    { text: "Sofremos mais na imaginação do que na realidade.", author: "Sêneca", category: "stoicism" },
    { text: "A vida é muito curta para ser pequena.", author: "Benjamin Disraeli", category: "motivation" },
    { text: "O autocontrole é a força. O pensamento calmo é a maestria.", author: "James Allen", category: "stoicism" },
    { text: "Aja como se o que você faz fizesse diferença. Faz.", author: "William James", category: "motivation" },
    { text: "O fracasso é apenas a oportunidade de recomeçar de forma mais inteligente.", author: "Henry Ford", category: "motivation" },
    { text: "A única maneira de fazer um excelente trabalho é amar o que você faz.", author: "Steve Jobs", category: "motivation" },
    { text: "A mente é tudo. O que você pensa, você se torna.", author: "Buda", category: "stoicism" },
    { text: "A paz vem de dentro. Não a procure fora.", author: "Buda", category: "stoicism" },

    // More Health
    { text: "Um corpo em forma é a melhor declaração de moda.", author: "Desconhecido", category: "health" },
    { text: "Não deixe para amanhã o que você pode suar hoje.", author: "Desconhecido", category: "health" },
    { text: "Sua dieta é uma conta bancária. Boas escolhas alimentares são bons investimentos.", author: "Bethenny Frankel", category: "health" },
    { text: "Água é a força motriz de toda a natureza.", author: "Leonardo da Vinci", category: "health" },
    { text: "Dormir é o melhor remédio.", author: "Provérbio", category: "health" },
    { text: "O movimento é um remédio para criar mudanças nos estados físicos, emocionais e mentais.", author: "Carol Welch", category: "health" },
    { text: "A saúde não é apenas a ausência de doença, é o completo bem-estar.", author: "OMS", category: "health" },
    { text: "Respire fundo. É apenas um dia ruim, não uma vida ruim.", author: "Desconhecido", category: "health" },
    { text: "Caminhar é o melhor exercício do homem.", author: "Hipócrates", category: "health" },
    { text: "Que seu remédio seja seu alimento, e que seu alimento seja seu remédio.", author: "Hipócrates", category: "health" },

    // More Discipline
    { text: "Foco é dizer não.", author: "Steve Jobs", category: "discipline" },
    { text: "A disciplina é a mãe do sucesso.", author: "Ésquilo", category: "discipline" },
    { text: "Sem autodisciplina, o sucesso é impossível, ponto final.", author: "Lou Holtz", category: "discipline" },
    { text: "A força de vontade é como um músculo. Quanto mais você a usa, mais forte ela fica.", author: "Desconhecido", category: "discipline" },
    { text: "O talento sem disciplina é como um polvo de patins.", author: "H. Jackson Brown Jr.", category: "discipline" },
    { text: "A procrastinação é a ladra do tempo.", author: "Edward Young", category: "discipline" },
    { text: "Faça o que deve ser feito, quando deve ser feito.", author: "Desconhecido", category: "discipline" },
    { text: "A consistência supera a intensidade.", author: "Desconhecido", category: "discipline" },
    { text: "O sucesso não é um acidente. É trabalho duro e aprendizado.", author: "Pelé", category: "discipline" },
    { text: "Domine a si mesmo e dominará o inimigo.", author: "Sun Tzu", category: "discipline" },

    // Random Mix
    { text: "A vida acontece agora.", author: "Eckhart Tolle", category: "motivation" },
    { text: "Seja a energia que você quer atrair.", author: "Desconhecido", category: "motivation" },
    { text: "O otimismo é a fé que leva à realização.", author: "Helen Keller", category: "motivation" },
    { text: "Não espere. O tempo nunca será o 'certo'.", author: "Napoleon Hill", category: "motivation" },
    { text: "A melhor saída é sempre através.", author: "Robert Frost", category: "motivation" },
    { text: "A simplicidade é o último grau de sofisticação.", author: "Leonardo da Vinci", category: "stoicism" },
    { text: "A vida é 10% o que acontece comigo e 90% de como eu reajo a isso.", author: "Charles Swindoll", category: "stoicism" },
    { text: "Ame a vida que você vive. Viva a vida que você ama.", author: "Bob Marley", category: "motivation" },
    { text: "A única limitação é a que você impõe a si mesmo.", author: "Desconhecido", category: "motivation" },
    { text: "Sua atitude determina sua altitude.", author: "Zig Ziglar", category: "motivation" },
    { text: "O impossível é apenas uma opinião.", author: "Paulo Coelho", category: "motivation" },
    { text: "Sonhe grande e ouse falhar.", author: "Norman Vaughan", category: "motivation" },
    { text: "A vida é uma aventura ousada ou nada.", author: "Helen Keller", category: "motivation" },
    { text: "A melhor maneira de prever o futuro é criá-lo.", author: "Peter Drucker", category: "motivation" },
    { text: "A felicidade não é algo pronto. Ela vem de suas próprias ações.", author: "Dalai Lama", category: "stoicism" },
    { text: "Se você não pode fazer grandes coisas, faça pequenas coisas de uma maneira grande.", author: "Napoleon Hill", category: "motivation" },
    { text: "A gratidão transforma o que temos em suficiente.", author: "Desconhecido", category: "stoicism" },
    { text: "O que você procura está procurando por você.", author: "Rumi", category: "motivation" },
    { text: "A calma é um superpoder.", author: "Desconhecido", category: "stoicism" },
    { text: "Resiliência é a capacidade de se recuperar.", author: "Desconhecido", category: "discipline" },
    { text: "Cada dia é uma nova oportunidade.", author: "Desconhecido", category: "motivation" },
    { text: "Ame a si mesmo primeiro.", author: "Desconhecido", category: "health" },
    { text: "Beba água e cuide da sua mente.", author: "Desconhecido", category: "health" },
    { text: "O equilíbrio é a chave.", author: "Desconhecido", category: "health" },
    { text: "Mente sã, corpo são.", author: "Juvenal", category: "health" }
];

export function getDailyQuote(): Quote {
    // Use the current date to seed the random selection so it changes daily
    const today = new Date();
    const seed = Math.floor(today.getTime() / (1000 * 60 * 60 * 24)); // Days since epoch
    const index = seed % quotes.length;
    return quotes[index];
}
