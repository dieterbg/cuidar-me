"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Patient } from "@/lib/types";
import {
    User,
    Mail,
    Phone,
    Calendar,
    VenetianMask,
    Ruler,
    Scale,
    Target,
    Activity,
    AlertCircle,
    Hash,
    ShieldCheck
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PatientProfileSummaryProps {
    patient: Patient;
}

export function PatientProfileSummary({ patient }: PatientProfileSummaryProps) {
    const formatDate = (date: string | Date | null | undefined) => {
        if (!date) return "Não informado";
        try {
            return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return "Data inválida";
        }
    };

    const calculateAge = (birthDate: string | Date | null | undefined) => {
        if (!birthDate) return null;
        try {
            const today = new Date();
            const birth = new Date(birthDate);
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            return age > 0 ? age : null;
        } catch {
            return null;
        }
    };

    const age = calculateAge(patient.birthDate);

    const InfoItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | number | null | undefined }) => (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
            <div className="p-2 bg-primary/5 rounded-lg shrink-0">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 truncate">{label}</p>
                <p className="text-sm font-semibold text-foreground break-words">{value || "Não informado"}</p>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card className="border-border/60 shadow-sm bg-card/50 overflow-hidden">
                <div className="h-1.5 bg-primary/20" />
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" /> Dados Pessoais
                    </CardTitle>
                    <CardDescription>Informações de contato e identificação geral.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoItem icon={User} label="Nome Completo" value={patient.fullName} />
                    <InfoItem icon={Mail} label="E-mail" value={patient.email} />
                    <InfoItem icon={Phone} label="WhatsApp" value={patient.whatsappNumber} />
                    <InfoItem
                        icon={Calendar}
                        label="Nascimento"
                        value={age ? `${formatDate(patient.birthDate)} (${age} anos)` : formatDate(patient.birthDate)}
                    />
                    <InfoItem
                        icon={VenetianMask}
                        label="Gênero"
                        value={patient.gender ? (patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)) : "Não informado"}
                    />
                    <InfoItem
                        icon={Hash}
                        label="Username Comunidade"
                        value={patient.communityUsername ? `@${patient.communityUsername}` : "Não configurado"}
                    />
                </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm bg-card/50 overflow-hidden">
                <div className="h-1.5 bg-amber-400/20" />
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" /> Perfil Clínico
                    </CardTitle>
                    <CardDescription>Métricas básicas, objetivos e histórico de saúde.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <InfoItem icon={Ruler} label="Altura" value={patient.height ? `${patient.height} cm` : null} />
                        <InfoItem icon={Scale} label="Peso Inicial" value={patient.initialWeight ? `${patient.initialWeight} kg` : null} />
                        <InfoItem icon={Target} label="Meta de Peso" value={patient.weightGoal ? `${patient.weightGoal} kg` : null} />
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 rounded-xl border border-border/40 bg-muted/10 group">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Condições de Saúde</h4>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                {patient.healthConditions || "Nenhuma condição relatada pelo paciente."}
                            </p>
                        </div>

                        <div className="p-4 rounded-xl border border-border/40 bg-muted/10 group">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-0.5 bg-rose-100 dark:bg-rose-900/30 rounded">
                                    <AlertCircle className="h-4 w-4 text-rose-500 group-hover:rotate-12 transition-transform" />
                                </div>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Alergias</h4>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                {patient.allergies || "Nenhuma alergia relatada pelo paciente."}
                            </p>
                        </div>

                        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                            <div className="text-xs">
                                <p className="font-bold text-primary uppercase tracking-tight">Privacidade garantida</p>
                                <p className="text-muted-foreground">Estes dados são acessíveis apenas pela equipe autorizada.</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
