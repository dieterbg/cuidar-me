import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Clínica Dornelles | Emagrecimento com Acompanhamento Real em Novo Hamburgo',
    description:
        'Emagrecimento com acompanhamento diário de verdade. Na Clínica Dornelles, você nunca fica sozinha na sua jornada. Dra. Bruna e Dr. Lúcio Dornelles — Novo Hamburgo/RS.',
    keywords: [
        'clínica dornelles',
        'emagrecimento novo hamburgo',
        'acompanhamento médico diário',
        'dra bruna dornelles',
        'dr lúcio dornelles',
        'emagrecer com acompanhamento',
        'clínica emagrecimento rs',
        'saúde e bem-estar novo hamburgo',
    ],
    authors: [{ name: 'Dra. Bruna Dornelles' }, { name: 'Dr. Lúcio Dornelles' }],
    creator: 'Clínica Dornelles',
    openGraph: {
        title: 'Clínica Dornelles | Emagrecimento com Acompanhamento Real',
        description:
            'Aqui você não é mais um número. Acompanhamento diário, protocolo personalizado e uma equipe que realmente se importa.',
        url: 'https://clinicadornelles.com.br',
        siteName: 'Clínica Dornelles',
        locale: 'pt_BR',
        type: 'website',
    },
    robots: {
        index: true,
        follow: true,
    },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    name: 'Clínica Dornelles',
    image: 'https://clinicadornelles.com.br/logo-clinica.png',
    '@id': 'https://clinicadornelles.com.br',
    url: 'https://clinicadornelles.com.br',
    telephone: '+5551999999999',
    address: {
        '@type': 'PostalAddress',
        streetAddress: 'Rua Oscar Ludwig, 134',
        addressLocality: 'Novo Hamburgo',
        addressRegion: 'RS',
        postalCode: '93.548-480',
        addressCountry: 'BR',
    },
    geo: {
        '@type': 'GeoCoordinates',
        latitude: -29.6844,
        longitude: -51.1189,
    },
    openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00',
    },
    medicalSpecialty: ['Endocrinology', 'WeightManagement'],
};

/* ─── Icon Components ─── */

function LeafIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1.5 5-4 7-9 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
    );
}

function MapPinIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

function InstagramIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
    );
}

function HeartIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
    );
}

function MessageCircleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
    );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
        </svg>
    );
}

function UsersIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function ShieldCheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function CalendarCheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v4" /><path d="M16 2v4" />
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M3 10h18" />
            <path d="m9 16 2 2 4-4" />
        </svg>
    );
}

function TrendingUpIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    );
}

function ClockIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function QuoteIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" opacity="0.15">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
    );
}

/* ─── Page Component ─── */

export default function ClinicaPage() {
    return (
        <div className="min-h-screen bg-brand-muted">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* ─── Navbar ─── */}
            <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-brand-border">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Image
                            src="/logo-clinica.png"
                            alt="Clínica Dornelles"
                            width={40}
                            height={40}
                            className="rounded-full"
                        />
                        <span className="text-lg font-semibold text-[#2D3B2D]">
                            Clínica Dornelles
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#5A6B5A]">
                        <a href="#como-funciona" className="hover:text-brand transition-colors">
                            Como Funciona
                        </a>
                        <a href="#equipe" className="hover:text-brand transition-colors">
                            Equipe
                        </a>
                        <a href="#depoimentos" className="hover:text-brand transition-colors">
                            Depoimentos
                        </a>
                        <a href="#contato" className="hover:text-brand transition-colors">
                            Contato
                        </a>
                    </div>
                    <Link
                        href="/paciente"
                        className="hidden sm:inline-flex items-center px-5 py-2.5 rounded-full text-sm font-medium text-white bg-brand hover:bg-brand-hover transition-all hover:-translate-y-0.5 shadow-md shadow-brand/20"
                    >
                        Área do Paciente
                    </Link>
                </div>
            </nav>

            {/* ─── Hero ─── */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-brand/8 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-brand/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
                </div>

                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8">
                            <div className="flex items-center gap-4">
                                <Image
                                    src="/logo-clinica.png"
                                    alt="Clínica Dornelles"
                                    width={80}
                                    height={80}
                                    className="rounded-full shadow-lg"
                                />
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 text-brand text-sm font-medium">
                                    <MapPinIcon className="h-4 w-4" />
                                    Novo Hamburgo, RS
                                </div>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold text-[#2D3B2D] leading-[1.15] tracking-tight">
                                Cuidar de você deveria ser simples.{' '}
                                <span className="text-brand">A gente faz ser.</span>
                            </h1>
                            <p className="text-lg text-[#5A6B5A] leading-relaxed max-w-lg">
                                Na Clínica Dornelles, você tem acompanhamento de verdade — todos os dias, 
                                no seu WhatsApp. Um protocolo feito pra você, no seu ritmo, com uma equipe 
                                que realmente se importa com o seu resultado.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <a
                                    href="https://www.instagram.com/clinica.dornelles/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-white bg-brand hover:bg-brand-hover transition-all hover:-translate-y-0.5 shadow-lg shadow-brand/25"
                                >
                                    <InstagramIcon className="h-5 w-5" />
                                    Quero começar minha jornada
                                </a>
                                <a
                                    href="#como-funciona"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-[#2D3B2D] bg-white hover:bg-brand-muted transition-all border border-brand-border shadow-sm"
                                >
                                    Como funciona?
                                </a>
                            </div>
                        </div>

                        {/* Hero Visual Card */}
                        <div className="hidden md:flex justify-center">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-brand/10 rounded-[2.5rem] blur-xl" />
                                <div className="relative bg-white rounded-[2rem] p-8 shadow-2xl shadow-brand/10 border border-brand-border space-y-5">
                                    <div className="flex items-center gap-3 p-4 bg-brand-muted rounded-xl">
                                        <div className="h-10 w-10 rounded-lg bg-brand/15 flex items-center justify-center">
                                            <MessageCircleIcon className="h-5 w-5 text-brand" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#2D3B2D] text-sm">
                                                &quot;Bom dia! Como você está se sentindo hoje?&quot;
                                            </p>
                                            <p className="text-xs text-[#5A6B5A] mt-0.5">
                                                Check-in diário · 8h da manhã
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-brand-muted rounded-xl">
                                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">
                                            🎉
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#2D3B2D] text-sm">
                                                Sequência de 12 dias mantida!
                                            </p>
                                            <p className="text-xs text-[#5A6B5A] mt-0.5">
                                                Sua constância está fazendo diferença
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-brand-muted rounded-xl">
                                        <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-lg">
                                            💪
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#2D3B2D] text-sm">
                                                Meta semanal atingida!
                                            </p>
                                            <p className="text-xs text-[#5A6B5A] mt-0.5">
                                                Parabéns pela dedicação esta semana
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-brand-border">
                                        <p className="text-xs text-center text-[#5A6B5A] italic">
                                            Simulação do acompanhamento diário via WhatsApp
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── "Você se identifica?" — Seção de Empatia ─── */}
            <section className="py-16 md:py-24 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <p className="text-sm font-semibold text-brand uppercase tracking-widest mb-3">
                            Você não está sozinha
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-[#2D3B2D]">
                            Alguma dessas frases parece sua?
                        </h2>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        {[
                            'Começo um tratamento empolgada, mas logo me sinto abandonada.',
                            'Saio da consulta motivada, mas em casa a rotina me engole.',
                            'Sinto que meu corpo não responde como antes.',
                            'Queria ter alguém pra perguntar as coisas no dia a dia.',
                            'Já passei por vários profissionais e nenhum me acompanhou de verdade.',
                            'Quero cuidar de mim, mas não sei mais por onde começar.',
                        ].map((frase, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-3 p-5 rounded-xl bg-brand-muted border border-brand-border hover:border-brand/30 transition-colors"
                            >
                                <span className="text-brand mt-0.5 text-lg flex-shrink-0">&ldquo;</span>
                                <p className="text-[#2D3B2D] text-[15px] leading-relaxed italic">
                                    {frase}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-10">
                        <p className="text-lg text-[#5A6B5A] max-w-2xl mx-auto leading-relaxed">
                            Se você se identificou com alguma dessas frases, saiba que{' '}
                            <span className="font-semibold text-[#2D3B2D]">o problema nunca foi falta de disciplina.</span>{' '}
                            Foi falta de acompanhamento.
                        </p>
                    </div>
                </div>
            </section>

            {/* ─── Como Funciona — O Diferencial ─── */}
            <section id="como-funciona" className="py-20 md:py-28 bg-[#FAFBF7]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <p className="text-sm font-semibold text-brand uppercase tracking-widest mb-3">
                            Como Funciona
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-[#2D3B2D]">
                            Aqui, o tratamento não termina na consulta.
                        </h2>
                        <p className="text-[#5A6B5A] mt-4 leading-relaxed">
                            O que faz a diferença não é só o protocolo — é ter alguém do seu lado, 
                            todos os dias, cuidando da sua evolução.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: CalendarCheckIcon,
                                title: 'Protocolo só seu',
                                description:
                                    'Nada de fórmula pronta. Seu tratamento é montado a partir da sua rotina, do seu corpo e dos seus objetivos.',
                            },
                            {
                                icon: MessageCircleIcon,
                                title: 'Presença diária',
                                description:
                                    'Todo dia, no seu WhatsApp, a gente pergunta como você está. E escuta de verdade.',
                            },
                            {
                                icon: TrendingUpIcon,
                                title: 'Evolução visível',
                                description:
                                    'Você acompanha cada conquista. Cada passo conta — e a gente celebra junto com você.',
                            },
                            {
                                icon: HeartIcon,
                                title: 'Suporte real',
                                description:
                                    'Dia difícil? Dúvida no meio da semana? Pode falar. A gente não some depois da consulta.',
                            },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="group relative bg-white rounded-2xl p-7 border border-brand-border hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300"
                            >
                                <div className="h-12 w-12 rounded-xl bg-brand/10 flex items-center justify-center mb-5 group-hover:bg-brand/15 transition-colors">
                                    <item.icon className="h-6 w-6 text-brand" />
                                </div>
                                <h3 className="text-lg font-semibold text-[#2D3B2D] mb-2">
                                    {item.title}
                                </h3>
                                <p className="text-[#5A6B5A] text-sm leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Seção Aspiracional ─── */}
            <section className="py-20 md:py-28 bg-white overflow-hidden">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-6">
                            <p className="text-sm font-semibold text-brand uppercase tracking-widest">
                                Sua Jornada
                            </p>
                            <h2 className="text-3xl md:text-4xl font-bold text-[#2D3B2D] leading-tight">
                                Imagine ter mais energia, mais disposição e mais confiança.
                            </h2>
                            <div className="space-y-4 text-[#5A6B5A] leading-relaxed">
                                <p>
                                    Imagine acordar com mais leveza. Ter disposição pra fazer o que você gosta. 
                                    Sentir que o seu corpo está respondendo. Perceber, aos poucos, que 
                                    as coisas estão mudando — porque dessa vez alguém está caminhando junto.
                                </p>
                                <p>
                                    Não importa se o seu objetivo é perder peso, ter mais saúde, melhorar
                                    seus exames ou simplesmente se sentir melhor consigo mesma.{' '}
                                    <span className="font-medium text-[#2D3B2D]">
                                        O que importa é que dessa vez, você não vai fazer isso sozinha.
                                    </span>
                                </p>
                            </div>
                            <a
                                href="https://www.instagram.com/clinica.dornelles/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover transition-all hover:-translate-y-0.5 shadow-md shadow-brand/20"
                            >
                                <SparklesIcon className="h-4 w-4" />
                                Quero dar o primeiro passo
                            </a>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-4 bg-brand/5 rounded-[2rem] blur-xl" />
                            <div className="relative bg-brand-muted rounded-[2rem] p-8 border border-brand-border">
                                <div className="grid grid-cols-2 gap-5">
                                    {[
                                        { value: '500+', label: 'Pacientes que confiaram na gente', icon: UsersIcon },
                                        { value: '95%', label: 'Se sentem acompanhados de verdade', icon: HeartIcon },
                                        { value: '78%', label: 'Alcançam suas metas', icon: TrendingUpIcon },
                                        { value: '3+', label: 'Anos cuidando de pessoas', icon: ShieldCheckIcon },
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-white rounded-xl p-5 border border-brand-border text-center">
                                            <stat.icon className="h-5 w-5 text-brand mx-auto mb-2" />
                                            <p className="text-2xl font-bold text-brand">{stat.value}</p>
                                            <p className="text-xs text-[#5A6B5A] mt-1 leading-snug">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Equipe ─── */}
            <section id="equipe" className="py-20 md:py-28 bg-[#FAFBF7]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <p className="text-sm font-semibold text-brand uppercase tracking-widest mb-3">
                            Quem Cuida de Você
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-[#2D3B2D]">
                            Uma equipe que trata pessoas, não números.
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {[
                            {
                                name: 'Dra. Bruna Dornelles',
                                crm: 'CRM 38598 | RQE 35151',
                                quote:
                                    'Cada paciente que entra aqui tem uma história. Meu trabalho é fazer parte dela — com respeito, com ciência e com carinho.',
                                description:
                                    'Especialista em saúde metabólica e emagrecimento, com foco em tratamentos individualizados e baseados em evidências.',
                                initials: 'BD',
                            },
                            {
                                name: 'Dr. Lúcio Dornelles',
                                crm: 'CRM 33525 | RQE 37042',
                                quote:
                                    'Ninguém deveria passar por uma jornada de saúde sozinho. Por isso criamos um acompanhamento que vai além da consulta.',
                                description:
                                    'Especialista com ampla experiência em protocolos clínicos personalizados e acompanhamento integral.',
                                initials: 'LD',
                            },
                        ].map((doctor, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-2xl p-8 border border-brand-border shadow-sm hover:shadow-lg hover:shadow-brand/5 transition-all duration-300"
                            >
                                <div className="flex items-start gap-5 mb-5">
                                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-brand to-[#a8b87a] flex items-center justify-center flex-shrink-0">
                                        <span className="text-2xl font-bold text-white">
                                            {doctor.initials}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-[#2D3B2D]">
                                            {doctor.name}
                                        </h3>
                                        <p className="text-sm font-medium text-brand">
                                            {doctor.crm}
                                        </p>
                                        <p className="text-[#5A6B5A] text-sm leading-relaxed mt-2">
                                            {doctor.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-brand-muted rounded-xl p-4 border border-brand-border">
                                    <p className="text-[#2D3B2D] text-sm italic leading-relaxed">
                                        &ldquo;{doctor.quote}&rdquo;
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Depoimentos ─── */}
            <section id="depoimentos" className="py-20 md:py-28 bg-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <p className="text-sm font-semibold text-brand uppercase tracking-widest mb-3">
                            Depoimentos
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-[#2D3B2D]">
                            O que nossos pacientes dizem
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                text: 'O que me ganhou foi o acompanhamento pelo WhatsApp. Antes eu ia na consulta, saía animada, mas em duas semanas já tinha esquecido tudo. Aqui não, tem alguém ali todo dia. Faz diferença demais.',
                                name: 'M.C.',
                                detail: 'Paciente há 8 meses',
                            },
                            {
                                text: 'Não vim pra emagrecer de forma radical, vim porque meus exames estavam ruins e eu vivia cansado. Em 4 meses meus triglicerídeos normalizaram e minha disposição mudou completamente.',
                                name: 'R.S.',
                                detail: 'Paciente há 6 meses',
                            },
                            {
                                text: 'Eu já tinha desistido de procurar médico pra isso. Mas aqui foi diferente. Me senti ouvida desde a primeira consulta. E o protocolo faz sentido pra minha rotina, não é aquela coisa genérica.',
                                name: 'A.L.',
                                detail: 'Paciente há 1 ano',
                            },
                            {
                                text: 'No início achei estranho receber mensagem todo dia, mas depois virou o que me mantém firme. Saber que alguém tá acompanhando muda tudo. Perdi 11 kg sem passar fome.',
                                name: 'J.P.',
                                detail: 'Paciente há 5 meses',
                            },
                            {
                                text: 'Minha mãe faz tratamento aqui e me indicou. Eu tinha resistência porque já tinha tentado outros médicos. Mas o diferencial real é que aqui não te abandonam depois da consulta.',
                                name: 'F.T.',
                                detail: 'Paciente há 4 meses',
                            },
                            {
                                text: 'Trabalho em turnos e achava impossível seguir qualquer protocolo. Montaram um plano que encaixa na minha vida real. Pela primeira vez to conseguindo ser constante.',
                                name: 'L.K.',
                                detail: 'Paciente há 7 meses',
                            },
                        ].map((depoimento, i) => (
                            <div
                                key={i}
                                className="relative bg-brand-muted rounded-2xl p-7 border border-brand-border hover:border-brand/20 transition-colors"
                            >
                                <QuoteIcon className="absolute top-5 right-5 h-10 w-10 text-brand" />
                                <p className="text-[#2D3B2D] text-sm leading-relaxed mb-5 relative z-10">
                                    &ldquo;{depoimento.text}&rdquo;
                                </p>
                                <div className="flex items-center gap-3 pt-4 border-t border-brand-border">
                                    <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center">
                                        <span className="text-xs font-semibold text-brand">{depoimento.name}</span>
                                    </div>
                                    <p className="text-xs text-[#5A6B5A]">{depoimento.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Sobre — Menção sutil à tecnologia ─── */}
            <section className="py-16 md:py-20 bg-[#FAFBF7]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl p-8 md:p-10 border border-brand-border shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center">
                                <LeafIcon className="h-5 w-5 text-brand" />
                            </div>
                            <h2 className="text-xl font-bold text-[#2D3B2D]">Sobre a Clínica</h2>
                        </div>
                        <div className="space-y-4 text-[#5A6B5A] leading-relaxed text-[15px]">
                            <p>
                                A Clínica Dornelles nasceu de uma convicção: de que o cuidado com a saúde 
                                precisa ir além do consultório. Muitas pessoas iniciam um tratamento 
                                cheias de esperança, mas se sentem sozinhas no dia a dia — e acabam desistindo.
                            </p>
                            <p>
                                Por isso criamos um modelo de acompanhamento contínuo. Através da nossa 
                                plataforma, cada paciente recebe atenção diária, com check-ins no WhatsApp, 
                                monitoramento da evolução e suporte sempre que precisar. Por trás, utilizamos 
                                um assistente inteligente que garante que nenhum paciente fique sem resposta — 
                                mas o que você sente é cuidado humano.
                            </p>
                            <p>
                                São mais de 3 anos dedicados a essa missão, com uma equipe que acredita que
                                constância e acolhimento são tão importantes quanto a prescrição médica.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Contato / CTA Final ─── */}
            <section id="contato" className="py-20 md:py-28 bg-[#2D3B2D]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-14">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            O primeiro passo é o mais difícil.
                            <br />
                            <span className="text-[#a8b87a]">O segundo, a gente dá junto.</span>
                        </h2>
                        <p className="text-white/70 leading-relaxed">
                            Agende sua consulta pelo nosso Instagram ou venha nos conhecer pessoalmente.
                            Estamos em Novo Hamburgo, prontos pra cuidar de você.
                        </p>
                        <a
                            href="https://www.instagram.com/clinica.dornelles/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 mt-8 px-10 py-4 rounded-2xl text-base font-semibold text-[#2D3B2D] bg-white hover:bg-brand-muted transition-all hover:-translate-y-0.5 shadow-lg"
                        >
                            <InstagramIcon className="h-5 w-5" />
                            Agendar pelo Instagram
                        </a>
                    </div>

                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
                        <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <div className="h-14 w-14 mx-auto rounded-2xl bg-brand/20 flex items-center justify-center mb-5">
                                <MapPinIcon className="h-7 w-7 text-[#a8b87a]" />
                            </div>
                            <h3 className="font-semibold text-white mb-2">Endereço</h3>
                            <p className="text-white/70 text-sm leading-relaxed">
                                Rua Oscar Ludwig, 134
                                <br />
                                Jardim Mauá
                                <br />
                                Novo Hamburgo - RS
                                <br />
                                CEP 93.548-480
                            </p>
                        </div>

                        <a
                            href="mailto:contato@clinicadornelles.com.br"
                            className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors group"
                        >
                            <div className="h-14 w-14 mx-auto rounded-2xl bg-brand/20 flex items-center justify-center mb-5 group-hover:bg-brand/30 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#a8b87a]"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                            </div>
                            <h3 className="font-semibold text-white mb-2">E-mail</h3>
                            <p className="text-white/70 text-sm">contato@clinicadornelles.com.br</p>
                            <p className="text-[#a8b87a] text-sm mt-2 font-medium">
                                Envie-nos →
                            </p>
                        </a>

                        <a
                            href="https://www.instagram.com/clinica.dornelles/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors group"
                        >
                            <div className="h-14 w-14 mx-auto rounded-2xl bg-brand/20 flex items-center justify-center mb-5 group-hover:bg-brand/30 transition-colors">
                                <InstagramIcon className="h-7 w-7 text-[#a8b87a]" />
                            </div>
                            <h3 className="font-semibold text-white mb-2">Instagram</h3>
                            <p className="text-white/70 text-sm">@clinica.dornelles</p>
                            <p className="text-[#a8b87a] text-sm mt-2 font-medium">
                                Siga-nos →
                            </p>
                        </a>

                        <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <div className="h-14 w-14 mx-auto rounded-2xl bg-brand/20 flex items-center justify-center mb-5">
                                <ClockIcon className="h-7 w-7 text-[#a8b87a]" />
                            </div>
                            <h3 className="font-semibold text-white mb-2">Horário</h3>
                            <p className="text-white/70 text-sm leading-relaxed">
                                Segunda a Sexta
                                <br />
                                8h às 18h
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Trust & Privacy Bar ─── */}
            <section className="bg-brand-muted border-y border-brand/10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
                            <div className="flex items-center gap-2.5 text-sm text-[#2D3B2D]/70">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>
                                Em conformidade com a LGPD
                            </div>
                            <div className="flex items-center gap-2.5 text-sm text-[#2D3B2D]/70">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                Dados criptografados
                            </div>
                            <div className="flex items-center gap-2.5 text-sm text-[#2D3B2D]/70">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                WhatsApp apenas com seu consentimento
                            </div>
                        </div>
                        <Link
                            href="/privacidade"
                            className="text-sm font-medium text-brand hover:text-brand-hover transition-colors underline underline-offset-4"
                        >
                            Política de Privacidade →
                        </Link>
                    </div>
                </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="bg-[#232F23] text-white/50 py-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                            <Image
                                src="/logo-clinica.png"
                                alt="Clínica Dornelles"
                                width={32}
                                height={32}
                                className="rounded-full opacity-80"
                            />
                            <span className="text-sm font-medium text-white/70">
                                Clínica Dornelles
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link href="/privacidade" className="text-xs text-white/50 hover:text-white/80 transition-colors underline underline-offset-2">
                                Política de Privacidade
                            </Link>
                            <span className="text-white/20">·</span>
                            <p className="text-xs">
                                BW Serviços Médicos LTDA · CNPJ 50.429.188/0001-66 · Novo Hamburgo, RS
                            </p>
                        </div>
                        <p className="text-xs">
                            © {new Date().getFullYear()} Todos os direitos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
