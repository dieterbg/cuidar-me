import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Clínica Dornelles | Saúde Metabólica e Emagrecimento Individualizado',
    description:
        'A Clínica Dornelles é referência em saúde metabólica e emagrecimento individualizado em Novo Hamburgo/RS. Dra. Bruna Dornelles e Dr. Lúcio Dornelles oferecem atendimento personalizado com acompanhamento via WhatsApp.',
    keywords: [
        'clínica dornelles',
        'saúde metabólica',
        'emagrecimento individualizado',
        'novo hamburgo',
        'endocrinologia',
        'nutrição',
        'acompanhamento whatsapp',
    ],
    openGraph: {
        title: 'Clínica Dornelles | Saúde Metabólica e Emagrecimento',
        description:
            'Referência em saúde metabólica e emagrecimento individualizado em Novo Hamburgo/RS.',
        type: 'website',
    },
};

function LeafIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1.5 5-4 7-9 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
    );
}

function MapPinIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

function PhoneIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    );
}

function InstagramIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
    );
}

function HeartPulseIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19.5 12.572l-7.5 7.428l-7.5-7.428A5 5 0 0 1 12 6.006a5 5 0 0 1 7.5 6.572" />
            <path d="M5 12h2l2 3l4-6l2 3h2" />
        </svg>
    );
}

function UserIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function ShieldIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function SmartphoneIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
            <path d="M12 18h.01" />
        </svg>
    );
}

function ClockIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

export default function ClinicaPage() {
    return (
        <div className="min-h-screen bg-[#FAFBF7]">
            {/* ─── Navbar ─── */}
            <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-[#E8E9E4]">
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
                        <a href="#sobre" className="hover:text-[#899d5e] transition-colors">
                            Sobre
                        </a>
                        <a href="#servicos" className="hover:text-[#899d5e] transition-colors">
                            Serviços
                        </a>
                        <a href="#equipe" className="hover:text-[#899d5e] transition-colors">
                            Equipe
                        </a>
                        <a href="#contato" className="hover:text-[#899d5e] transition-colors">
                            Contato
                        </a>
                    </div>
                    <Link
                        href="/paciente"
                        className="hidden sm:inline-flex items-center px-5 py-2.5 rounded-full text-sm font-medium text-white bg-[#899d5e] hover:bg-[#7a8c53] transition-all hover:-translate-y-0.5 shadow-md shadow-[#899d5e]/20"
                    >
                        Área do Paciente
                    </Link>
                </div>
            </nav>

            {/* ─── Hero ─── */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-[#899d5e]/8 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-[#899d5e]/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
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
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#899d5e]/10 text-[#899d5e] text-sm font-medium">
                                    <LeafIcon className="h-4 w-4" />
                                    Novo Hamburgo, RS
                                </div>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#2D3B2D] leading-tight tracking-tight">
                                Saúde metabólica e emagrecimento{' '}
                                <span className="text-[#899d5e]">individualizado</span>
                            </h1>
                            <p className="text-lg text-[#5A6B5A] leading-relaxed max-w-lg">
                                Na Clínica Dornelles, tratamos cada paciente como único.
                                Desenvolvimento de protocolos personalizados com acompanhamento
                                contínuo via WhatsApp e inteligência artificial.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <a
                                    href="https://www.instagram.com/clinica.dornelles/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-white bg-[#899d5e] hover:bg-[#7a8c53] transition-all hover:-translate-y-0.5 shadow-lg shadow-[#899d5e]/25"
                                >
                                    <InstagramIcon className="h-5 w-5" />
                                    Agende sua Consulta
                                </a>
                                <a
                                    href="#servicos"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-[#2D3B2D] bg-white hover:bg-[#F5F6F2] transition-all border border-[#E8E9E4] shadow-sm"
                                >
                                    Conheça nossos serviços
                                </a>
                            </div>
                        </div>

                        {/* Hero Visual Card */}
                        <div className="hidden md:flex justify-center">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-[#899d5e]/10 rounded-[2.5rem] blur-xl" />
                                <div className="relative bg-white rounded-[2rem] p-8 shadow-2xl shadow-[#899d5e]/10 border border-[#E8E9E4] space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-2xl bg-[#899d5e]/10 flex items-center justify-center">
                                            <HeartPulseIcon className="h-7 w-7 text-[#899d5e]" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-[#2D3B2D]">Saúde Metabólica</p>
                                            <p className="text-sm text-[#5A6B5A]">Avaliação completa</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-2xl bg-[#899d5e]/10 flex items-center justify-center">
                                            <UserIcon className="h-7 w-7 text-[#899d5e]" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-[#2D3B2D]">Individualizado</p>
                                            <p className="text-sm text-[#5A6B5A]">Protocolo personalizado</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-2xl bg-[#899d5e]/10 flex items-center justify-center">
                                            <SmartphoneIcon className="h-7 w-7 text-[#899d5e]" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-[#2D3B2D]">Acompanhamento Digital</p>
                                            <p className="text-sm text-[#5A6B5A]">WhatsApp + IA</p>
                                        </div>
                                    </div>
                                    <div className="h-3 rounded-full bg-[#F5F6F2] overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-[#899d5e] to-[#a8b87a]"
                                            style={{ width: '78%' }}
                                        />
                                    </div>
                                    <p className="text-xs text-center text-[#5A6B5A]">
                                        78% dos pacientes alcançam suas metas com nosso método
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Services ─── */}
            <section id="servicos" className="py-20 md:py-28 bg-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <p className="text-sm font-semibold text-[#899d5e] uppercase tracking-widest mb-3">
                            Nossos Serviços
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-[#2D3B2D]">
                            Cuidado completo para sua saúde
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: HeartPulseIcon,
                                title: 'Saúde Metabólica',
                                description:
                                    'Avaliação completa do metabolismo com exames laboratoriais, análise de composição corporal e identificação de desequilíbrios hormonais.',
                            },
                            {
                                icon: UserIcon,
                                title: 'Emagrecimento Individualizado',
                                description:
                                    'Protocolos 100% personalizados, considerando sua genética, estilo de vida, preferências alimentares e objetivos de saúde.',
                            },
                            {
                                icon: SmartphoneIcon,
                                title: 'Acompanhamento via WhatsApp',
                                description:
                                    'Suporte contínuo com check-ins diários, protocolos gamificados e inteligência artificial para manter você motivado(a).',
                            },
                            {
                                icon: ShieldIcon,
                                title: 'Protocolos Clínicos',
                                description:
                                    'Tratamentos baseados em evidências científicas com acompanhamento regular e ajuste contínuo conforme sua evolução.',
                            },
                            {
                                icon: ClockIcon,
                                title: 'Check-ins Diários',
                                description:
                                    'Monitoramento diário automático que gera insights valiosos sobre sua evolução e ajuda a manter a constância.',
                            },
                            {
                                icon: LeafIcon,
                                title: 'Bem-estar Integral',
                                description:
                                    'Abordagem holística que integra saúde física, mental e emocional para resultados sustentáveis a longo prazo.',
                            },
                        ].map((service, i) => (
                            <div
                                key={i}
                                className="group relative bg-[#FAFBF7] rounded-2xl p-8 border border-[#E8E9E4] hover:border-[#899d5e]/30 hover:shadow-lg hover:shadow-[#899d5e]/5 transition-all duration-300"
                            >
                                <div className="h-12 w-12 rounded-xl bg-[#899d5e]/10 flex items-center justify-center mb-5 group-hover:bg-[#899d5e]/15 transition-colors">
                                    <service.icon className="h-6 w-6 text-[#899d5e]" />
                                </div>
                                <h3 className="text-lg font-semibold text-[#2D3B2D] mb-3">
                                    {service.title}
                                </h3>
                                <p className="text-[#5A6B5A] text-sm leading-relaxed">
                                    {service.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Team ─── */}
            <section id="equipe" className="py-20 md:py-28 bg-[#FAFBF7]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <p className="text-sm font-semibold text-[#899d5e] uppercase tracking-widest mb-3">
                            Nossa Equipe
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-[#2D3B2D]">
                            Profissionais dedicados à sua saúde
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {[
                            {
                                name: 'Dra. Bruna Dornelles',
                                crm: 'CRM 38598 | RQE 35151',
                                description:
                                    'Especialista em saúde metabólica e emagrecimento, com foco em tratamentos individualizados e baseados em evidências científicas.',
                                initials: 'BD',
                            },
                            {
                                name: 'Dr. Lúcio Dornelles',
                                crm: 'CRM 33525 | RQE 37042',
                                description:
                                    'Especialista com ampla experiência em protocolos clínicos personalizados, dedicado ao acompanhamento integral dos pacientes.',
                                initials: 'LD',
                            },
                        ].map((doctor, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-2xl p-8 border border-[#E8E9E4] shadow-sm hover:shadow-lg hover:shadow-[#899d5e]/5 transition-all duration-300"
                            >
                                <div className="flex items-start gap-5">
                                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#899d5e] to-[#a8b87a] flex items-center justify-center flex-shrink-0">
                                        <span className="text-2xl font-bold text-white">
                                            {doctor.initials}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold text-[#2D3B2D]">
                                            {doctor.name}
                                        </h3>
                                        <p className="text-sm font-medium text-[#899d5e]">
                                            {doctor.crm}
                                        </p>
                                        <p className="text-[#5A6B5A] text-sm leading-relaxed mt-3">
                                            {doctor.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── About ─── */}
            <section id="sobre" className="py-20 md:py-28 bg-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-6">
                            <p className="text-sm font-semibold text-[#899d5e] uppercase tracking-widest">
                                Sobre a Clínica
                            </p>
                            <h2 className="text-3xl md:text-4xl font-bold text-[#2D3B2D] leading-tight">
                                Tecnologia e empatia a serviço da sua saúde
                            </h2>
                            <p className="text-[#5A6B5A] leading-relaxed">
                                A Clínica Dornelles foi fundada com a missão de oferecer um atendimento
                                médico verdadeiramente personalizado. Utilizamos tecnologia de ponta,
                                incluindo inteligência artificial e acompanhamento via WhatsApp, para
                                garantir que você tenha suporte contínuo em sua jornada de saúde.
                            </p>
                            <p className="text-[#5A6B5A] leading-relaxed">
                                Nossa plataforma Cuidar.me permite que os pacientes recebam check-ins
                                diários, acompanhem seus protocolos com gamificação e tenham acesso a
                                uma IA treinada para apoiá-los com informações e motivação.
                            </p>
                            <div className="grid grid-cols-3 gap-6 pt-4">
                                {[
                                    { value: '500+', label: 'Pacientes' },
                                    { value: '95%', label: 'Satisfação' },
                                    { value: '3+', label: 'Anos' },
                                ].map((stat, i) => (
                                    <div key={i} className="text-center">
                                        <p className="text-2xl md:text-3xl font-bold text-[#899d5e]">
                                            {stat.value}
                                        </p>
                                        <p className="text-sm text-[#5A6B5A] mt-1">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-4 bg-[#899d5e]/5 rounded-[2rem] blur-xl" />
                            <div className="relative bg-[#FAFBF7] rounded-[2rem] p-8 border border-[#E8E9E4]">
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#E8E9E4]">
                                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">
                                            ✅
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#2D3B2D] text-sm">
                                                Check-in diário completado
                                            </p>
                                            <p className="text-xs text-[#5A6B5A]">
                                                Sequência de 12 dias mantida!
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#E8E9E4]">
                                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">
                                            💧
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#2D3B2D] text-sm">
                                                Hidratação registrada
                                            </p>
                                            <p className="text-xs text-[#5A6B5A]">
                                                +15 pontos de bem-estar
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#E8E9E4]">
                                        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">
                                            🏆
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#2D3B2D] text-sm">
                                                Meta semanal atingida!
                                            </p>
                                            <p className="text-xs text-[#5A6B5A]">
                                                Parabéns pela constância!
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Contact ─── */}
            <section id="contato" className="py-20 md:py-28 bg-[#2D3B2D]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <p className="text-sm font-semibold text-[#a8b87a] uppercase tracking-widest mb-3">
                            Contato
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold text-white">
                            Venha nos conhecer
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                        <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <div className="h-14 w-14 mx-auto rounded-2xl bg-[#899d5e]/20 flex items-center justify-center mb-5">
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
                            href="https://www.instagram.com/clinica.dornelles/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors group"
                        >
                            <div className="h-14 w-14 mx-auto rounded-2xl bg-[#899d5e]/20 flex items-center justify-center mb-5 group-hover:bg-[#899d5e]/30 transition-colors">
                                <InstagramIcon className="h-7 w-7 text-[#a8b87a]" />
                            </div>
                            <h3 className="font-semibold text-white mb-2">Instagram</h3>
                            <p className="text-white/70 text-sm">@clinica.dornelles</p>
                            <p className="text-[#a8b87a] text-sm mt-2 font-medium">
                                Siga-nos →
                            </p>
                        </a>

                        <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <div className="h-14 w-14 mx-auto rounded-2xl bg-[#899d5e]/20 flex items-center justify-center mb-5">
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
                        <p className="text-xs">
                            BW Serviços Médicos LTDA · CNPJ inscrito · Novo Hamburgo, RS
                        </p>
                        <p className="text-xs">
                            © {new Date().getFullYear()} Todos os direitos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
