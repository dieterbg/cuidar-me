'use client';

import { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
    getAuditLogs,
    getSecurityEvents,
    getBusinessEvents,
    getTwilioWebhooks,
    getLogsStats,
    type AuditLogRow,
    type SecurityEventRow,
    type BusinessEventRow,
    type TwilioWebhookRow,
} from '@/ai/actions/logs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldAlert, FileSearch, AlertTriangle, Activity, MessageSquare, RefreshCw, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function fmt(ts: string) {
    try { return format(new Date(ts), 'dd/MM HH:mm:ss', { locale: ptBR }); } catch { return ts; }
}

function SeverityBadge({ severity }: { severity: string }) {
    const variant = severity === 'critical' ? 'destructive' : severity === 'warning' ? 'default' : 'secondary';
    const cls = severity === 'critical' ? 'bg-red-600' : severity === 'warning' ? 'bg-amber-500' : '';
    return <Badge variant={variant as any} className={cls}>{severity}</Badge>;
}

export default function LogsPage() {
    const { profile, loading: authLoading } = useAuth();
    const [stats, setStats] = useState<Awaited<ReturnType<typeof getLogsStats>> | null>(null);
    const [audit, setAudit] = useState<AuditLogRow[]>([]);
    const [security, setSecurity] = useState<SecurityEventRow[]>([]);
    const [business, setBusiness] = useState<BusinessEventRow[]>([]);
    const [webhooks, setWebhooks] = useState<TwilioWebhookRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, startRefresh] = useTransition();
    const [auditFilter, setAuditFilter] = useState('');
    const [webhookStatusFilter, setWebhookStatusFilter] = useState('');

    async function loadAll() {
        const [s, a, sec, biz, web] = await Promise.all([
            getLogsStats(),
            getAuditLogs({ limit: 200 }),
            getSecurityEvents({ limit: 200 }),
            getBusinessEvents({ limit: 200 }),
            getTwilioWebhooks({ limit: 200 }),
        ]);
        setStats(s); setAudit(a); setSecurity(sec); setBusiness(biz); setWebhooks(web);
    }

    useEffect(() => {
        if (profile?.role !== 'admin') return;
        setLoading(true);
        loadAll().finally(() => setLoading(false));
    }, [profile?.role]);

    const refresh = () => startRefresh(() => { loadAll(); });

    if (authLoading) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

    if (profile?.role !== 'admin') {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Acesso negado</AlertTitle>
                    <AlertDescription>Apenas administradores podem acessar os logs.</AlertDescription>
                </Alert>
            </div>
        );
    }

    const filteredAudit = auditFilter
        ? audit.filter(r =>
            r.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
            (r.patient_name ?? '').toLowerCase().includes(auditFilter.toLowerCase()) ||
            (r.resource_type ?? '').toLowerCase().includes(auditFilter.toLowerCase())
        )
        : audit;

    const filteredWebhooks = webhookStatusFilter
        ? webhooks.filter(r => r.status === webhookStatusFilter)
        : webhooks;

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <FileSearch className="h-7 w-7 text-brand" />
                        Logs & Auditoria
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Trilha de auditoria LGPD, eventos de segurança, métricas de negócio e entregas Twilio.
                    </p>
                </div>
                <Button variant="outline" onClick={refresh} disabled={isRefreshing}>
                    {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Atualizar
                </Button>
            </div>

            {/* Stats tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatTile icon={<Activity className="h-5 w-5" />} label="Auditoria 24h" value={stats?.auditLast24h} loading={loading} />
                <StatTile icon={<ShieldAlert className="h-5 w-5 text-red-600" />} label="Segurança críticas 7d" value={stats?.securityCritical} loading={loading} highlight={!!stats?.securityCritical} />
                <StatTile icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} label="Webhooks falhos 24h" value={stats?.webhooksFailed24h} loading={loading} />
                <StatTile icon={<MessageSquare className="h-5 w-5 text-red-600" />} label="63049 (bloqueio Meta) 7d" value={stats?.webhooks63049_7d} loading={loading} highlight={!!stats?.webhooks63049_7d} />
            </div>

            <Tabs defaultValue="audit">
                <TabsList className="grid grid-cols-4 w-full md:w-[600px]">
                    <TabsTrigger value="audit">Auditoria</TabsTrigger>
                    <TabsTrigger value="security">Segurança</TabsTrigger>
                    <TabsTrigger value="business">Negócio</TabsTrigger>
                    <TabsTrigger value="webhooks">Twilio</TabsTrigger>
                </TabsList>

                {/* Audit */}
                <TabsContent value="audit">
                    <Card>
                        <CardHeader>
                            <CardTitle>Trilha de auditoria</CardTitle>
                            <CardDescription>Quem fez o quê, quando. Retenção 5 anos (CFM / LGPD Art. 19).</CardDescription>
                            <Input
                                placeholder="Filtrar por ação, paciente ou recurso…"
                                value={auditFilter}
                                onChange={(e) => setAuditFilter(e.target.value)}
                                className="mt-2 max-w-md"
                            />
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-64 w-full" /> : (
                                <div className="border rounded-lg overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Ação</TableHead>
                                                <TableHead>Recurso</TableHead>
                                                <TableHead>Paciente</TableHead>
                                                <TableHead>Papel</TableHead>
                                                <TableHead>IP</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredAudit.length === 0 ? (
                                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sem registros.</TableCell></TableRow>
                                            ) : filteredAudit.map(row => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="font-mono text-xs whitespace-nowrap">{fmt(row.created_at)}</TableCell>
                                                    <TableCell><Badge variant="outline">{row.action}</Badge></TableCell>
                                                    <TableCell className="text-xs">{row.resource_type}{row.resource_id ? ` · ${row.resource_id.slice(0, 8)}…` : ''}</TableCell>
                                                    <TableCell className="text-xs">
                                                        {row.patient_id ? (
                                                            <Link href={`/patient/${row.patient_id}/access-log`} className="text-brand hover:underline inline-flex items-center gap-1">
                                                                {row.patient_name ?? row.patient_id.slice(0, 8)}
                                                                <ExternalLink className="h-3 w-3" />
                                                            </Link>
                                                        ) : '—'}
                                                    </TableCell>
                                                    <TableCell><Badge variant="secondary">{row.actor_role ?? 'system'}</Badge></TableCell>
                                                    <TableCell className="text-xs font-mono">{row.ip ?? '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security */}
                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>Eventos de segurança</CardTitle>
                            <CardDescription>Tentativas de acesso não autorizado, rate limits, token inválido. Retenção 1 ano.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-64 w-full" /> : (
                                <div className="border rounded-lg overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Severidade</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead>Descrição</TableHead>
                                                <TableHead>IP</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {security.length === 0 ? (
                                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum evento registrado.</TableCell></TableRow>
                                            ) : security.map(row => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="font-mono text-xs whitespace-nowrap">{fmt(row.created_at)}</TableCell>
                                                    <TableCell><SeverityBadge severity={row.severity} /></TableCell>
                                                    <TableCell className="text-xs font-mono">{row.event_type}</TableCell>
                                                    <TableCell className="text-sm max-w-md truncate">{row.description ?? '—'}</TableCell>
                                                    <TableCell className="text-xs font-mono">{row.ip ?? '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Business */}
                <TabsContent value="business">
                    <Card>
                        <CardHeader>
                            <CardTitle>Eventos de negócio</CardTitle>
                            <CardDescription>Funil de onboarding, check-ins, opt-outs — pseudonimizado. Retenção 2 anos.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-64 w-full" /> : (
                                <div className="border rounded-lg overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead>Paciente (id)</TableHead>
                                                <TableHead>Metadata</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {business.length === 0 ? (
                                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sem registros.</TableCell></TableRow>
                                            ) : business.map(row => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="font-mono text-xs whitespace-nowrap">{fmt(row.created_at)}</TableCell>
                                                    <TableCell><Badge variant="outline">{row.event_type}</Badge></TableCell>
                                                    <TableCell className="text-xs font-mono">{row.patient_id ? row.patient_id.slice(0, 8) + '…' : '—'}</TableCell>
                                                    <TableCell className="text-xs font-mono max-w-md truncate">
                                                        {row.metadata && Object.keys(row.metadata).length > 0 ? JSON.stringify(row.metadata) : '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Twilio webhooks */}
                <TabsContent value="webhooks">
                    <Card>
                        <CardHeader>
                            <CardTitle>Entregas Twilio</CardTitle>
                            <CardDescription>Status callbacks do WhatsApp — rastreie falhas, erro 63049 (bloqueio Meta), 63016 (fora da janela 24h). Retenção 90 dias.</CardDescription>
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {['', 'sent', 'delivered', 'read', 'failed', 'undelivered'].map(s => (
                                    <Button
                                        key={s || 'all'}
                                        size="sm"
                                        variant={webhookStatusFilter === s ? 'default' : 'outline'}
                                        onClick={() => setWebhookStatusFilter(s)}
                                    >
                                        {s || 'Todos'}
                                    </Button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-64 w-full" /> : (
                                <div className="border rounded-lg overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>SID</TableHead>
                                                <TableHead>Erro</TableHead>
                                                <TableHead>Para</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredWebhooks.length === 0 ? (
                                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum webhook recebido ainda.</TableCell></TableRow>
                                            ) : filteredWebhooks.map(row => {
                                                const isError = row.status === 'failed' || row.status === 'undelivered';
                                                return (
                                                    <TableRow key={row.id} className={isError ? 'bg-red-50/50' : ''}>
                                                        <TableCell className="font-mono text-xs whitespace-nowrap">{fmt(row.created_at)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={isError ? 'destructive' : 'secondary'}>{row.status}</Badge>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">{row.message_sid?.slice(0, 12)}…</TableCell>
                                                        <TableCell className="text-xs">
                                                            {row.error_code ? (
                                                                <span className={row.error_code === 63049 ? 'text-red-600 font-bold' : 'text-amber-600'}>
                                                                    {row.error_code}
                                                                </span>
                                                            ) : '—'}
                                                            {row.error_message ? <span className="text-muted-foreground ml-1">{row.error_message.slice(0, 30)}…</span> : null}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">{row.to_number ?? '—'}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function StatTile({ icon, label, value, loading, highlight }: {
    icon: React.ReactNode;
    label: string;
    value: number | undefined;
    loading: boolean;
    highlight?: boolean;
}) {
    return (
        <Card className={highlight ? 'border-red-300 bg-red-50/40' : ''}>
            <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                    {icon} {label}
                </div>
                {loading ? <Skeleton className="h-8 w-16" /> : (
                    <div className={`text-3xl font-bold ${highlight ? 'text-red-600' : ''}`}>
                        {value ?? 0}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
