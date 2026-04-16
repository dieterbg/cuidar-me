import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
    title: 'Política de Privacidade | Clínica Dornelles',
    description: 'Política de Privacidade e Termos de Uso da Clínica Dornelles — Saúde Metabólica e Emagrecimento.',
};

export default function PrivacidadePage() {
    return (
        <div className="min-h-screen bg-brand-muted">
            {/* Header */}
            <header className="bg-white border-b border-brand/10 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <Image
                            src="/logo-clinica.png"
                            alt="Clínica Dornelles"
                            width={40}
                            height={40}
                            className="rounded-full border-2 border-brand/20 group-hover:border-brand/40 transition-colors"
                        />
                        <span className="font-semibold text-[#2D3B2D] group-hover:text-brand transition-colors">
                            Clínica Dornelles
                        </span>
                    </Link>
                    <Link
                        href="/"
                        className="text-sm text-brand hover:underline"
                    >
                        ← Voltar ao início
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white rounded-3xl border border-brand/10 shadow-sm p-8 sm:p-12 space-y-10">

                    {/* Title */}
                    <div className="text-center space-y-3 pb-8 border-b border-brand/10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 text-brand text-xs font-medium tracking-wide uppercase">
                            Documento Legal
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-[#2D3B2D]">
                            Política de Privacidade
                        </h1>
                        <p className="text-muted-foreground">
                            Última atualização: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                    </div>

                    {/* Sections */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#2D3B2D] flex items-center gap-2">
                            <span className="h-8 w-8 rounded-xl bg-brand/10 flex items-center justify-center text-sm font-bold text-brand">1</span>
                            Introdução
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            A <strong>BW Serviços Médicos LTDA</strong>, operando sob o nome fantasia <strong>Clínica Dornelles</strong>, com sede em Novo Hamburgo, RS,
                            está comprometida em proteger a privacidade e os dados pessoais de seus pacientes.
                            Esta política descreve como coletamos, usamos, armazenamos e protegemos suas informações de acordo com a
                            <strong> Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#2D3B2D] flex items-center gap-2">
                            <span className="h-8 w-8 rounded-xl bg-brand/10 flex items-center justify-center text-sm font-bold text-brand">2</span>
                            Dados que Coletamos
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Para oferecer nossos serviços de saúde metabólica e acompanhamento nutricional, podemos coletar:
                        </p>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-brand shrink-0" />
                                <span><strong>Dados de identificação:</strong> nome completo, e-mail, telefone/WhatsApp, data de nascimento e gênero.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-brand shrink-0" />
                                <span><strong>Dados de saúde:</strong> peso, altura, circunferência abdominal, condições de saúde pré-existentes, alergias e medicamentos em uso.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-brand shrink-0" />
                                <span><strong>Dados de navegação:</strong> informações técnicas de acesso ao portal do paciente (cookies essenciais de autenticação).</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-brand shrink-0" />
                                <span><strong>Dados de comunicação:</strong> mensagens trocadas via WhatsApp Business para acompanhamento do protocolo de emagrecimento.</span>
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#2D3B2D] flex items-center gap-2">
                            <span className="h-8 w-8 rounded-xl bg-brand/10 flex items-center justify-center text-sm font-bold text-brand">3</span>
                            Finalidade do Tratamento
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Seus dados são utilizados exclusivamente para:
                        </p>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-brand shrink-0" />
                                Prestação de serviços de saúde e acompanhamento médico personalizado.
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-brand shrink-0" />
                                Envio de mensagens via WhatsApp com orientações do protocolo de emagrecimento.
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-brand shrink-0" />
                                Monitoramento de métricas de saúde para avaliação do progresso do tratamento.
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-brand shrink-0" />
                                Comunicação sobre agendamentos, exames e informações relevantes ao tratamento.
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#2D3B2D] flex items-center gap-2">
                            <span className="h-8 w-8 rounded-xl bg-brand/10 flex items-center justify-center text-sm font-bold text-brand">4</span>
                            Comunicação via WhatsApp
                        </h2>
                        <div className="bg-brand/5 rounded-2xl p-6 border border-brand/10 space-y-3">
                            <p className="text-muted-foreground leading-relaxed">
                                Utilizamos o <strong>WhatsApp Business</strong> como canal de acompanhamento de saúde. Ao consentir, você poderá receber:
                            </p>
                            <ul className="space-y-2 text-muted-foreground text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="text-brand">✓</span>
                                    Mensagens de boas-vindas e orientações iniciais do protocolo
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-brand">✓</span>
                                    Lembretes diários de acompanhamento (peso, hidratação, alimentação)
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-brand">✓</span>
                                    Dicas personalizadas de saúde metabólica
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-brand">✓</span>
                                    Respostas a dúvidas sobre o tratamento
                                </li>
                            </ul>
                            <div className="pt-3 border-t border-brand/10">
                                <p className="text-sm text-[#2D3B2D] font-medium">
                                    📱 Para cancelar o recebimento de mensagens a qualquer momento, basta enviar <strong>&quot;SAIR&quot;</strong> ou <strong>&quot;PARAR&quot;</strong> no WhatsApp.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#2D3B2D] flex items-center gap-2">
                            <span className="h-8 w-8 rounded-xl bg-brand/10 flex items-center justify-center text-sm font-bold text-brand">5</span>
                            Armazenamento e Segurança
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Seus dados são armazenados em servidores seguros com criptografia em trânsito e em repouso.
                            Adotamos medidas técnicas e organizacionais para proteger suas informações contra acessos não autorizados,
                            perda acidental ou destruição. O acesso aos dados de saúde é restrito à equipe médica autorizada.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#2D3B2D] flex items-center gap-2">
                            <span className="h-8 w-8 rounded-xl bg-brand/10 flex items-center justify-center text-sm font-bold text-brand">6</span>
                            Seus Direitos (LGPD)
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Como titular de dados, você tem direito a:
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {[
                                { title: 'Acesso', desc: 'Solicitar cópia dos dados pessoais que possuímos sobre você.' },
                                { title: 'Correção', desc: 'Solicitar a correção de dados incompletos ou desatualizados.' },
                                { title: 'Eliminação', desc: 'Solicitar a exclusão dos seus dados pessoais.' },
                                { title: 'Revogação', desc: 'Revogar o consentimento para tratamento de dados a qualquer momento.' },
                                { title: 'Portabilidade', desc: 'Solicitar a portabilidade dos seus dados para outro prestador.' },
                                { title: 'Informação', desc: 'Ser informado sobre o compartilhamento de dados com terceiros.' },
                            ].map((right) => (
                                <div key={right.title} className="p-4 rounded-xl bg-brand-muted border border-brand/10">
                                    <h3 className="font-semibold text-[#2D3B2D] text-sm">{right.title}</h3>
                                    <p className="text-xs text-muted-foreground mt-1">{right.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#2D3B2D] flex items-center gap-2">
                            <span className="h-8 w-8 rounded-xl bg-brand/10 flex items-center justify-center text-sm font-bold text-brand">7</span>
                            Compartilhamento de Dados
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Seus dados <strong>não são vendidos ou compartilhados com terceiros para fins comerciais</strong>.
                            O compartilhamento ocorre apenas quando estritamente necessário para a prestação dos serviços de saúde,
                            como com laboratórios para análise de exames ou por determinação legal/judicial.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-[#2D3B2D] flex items-center gap-2">
                            <span className="h-8 w-8 rounded-xl bg-brand/10 flex items-center justify-center text-sm font-bold text-brand">8</span>
                            Contato do Encarregado (DPO)
                        </h2>
                        <div className="bg-[#2D3B2D] rounded-2xl p-6 text-white/90 space-y-2">
                            <p className="font-semibold text-white">Para exercer seus direitos ou tirar dúvidas:</p>
                            <p className="text-sm">📧 E-mail: <strong>privacidade@clinicadornelles.com.br</strong></p>
                            <p className="text-sm">📍 Endereço: Novo Hamburgo, RS</p>
                            <p className="text-xs text-white/60 mt-4">
                                Responderemos sua solicitação em até 15 dias úteis, conforme previsto na LGPD.
                            </p>
                        </div>
                    </section>

                </div>
            </main>

            {/* Footer */}
            <footer className="bg-[#232F23] text-white/50 py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs">
                    <p>© {new Date().getFullYear()} Clínica Dornelles · BW Serviços Médicos LTDA · Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    );
}
