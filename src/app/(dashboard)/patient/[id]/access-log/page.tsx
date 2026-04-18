'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getPatientAccessLog, type AuditLogRow } from '@/ai/actions/logs';
import { getPatientDetails } from '@/ai/actions/patients';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ShieldAlert, FileSearch, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function fmt(ts: string) {
    try { return format(new Date(ts), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }); } catch { return ts; }
}

export default function PatientAccessLogPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { profile, loading: authLoading } = useAuth();
    const [rows, setRows] = useState<AuditLogRow[]>([]);
    const [patientName, setPatientName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id || profile?.role !== 'admin') return;
        setLoading(true);
        Promise.all([
            getPatientAccessLog(id),
            getPatientDetails(id).catch(() => null),
        ]).then(([logs, details]) => {
            setRows(logs);
            setPatientName(details?.patient?.fullName ?? null);
        }).finally(() => setLoading(false));
    }, [id, profile?.role]);

    function exportCSV() {
        const header = ['data', 'acao', 'ator_role', 'ator_id', 'recurso', 'recurso_id', 'ip', 'metadata'];
        const lines = rows.map(r => [
            r.created_at,
            r.action,
            r.actor_role ?? '',
            r.actor_id ?? '',
            r.resource_type,
            r.resource_id ?? '',
            r.ip ?? '',
            JSON.stringify(r.metadata ?? {}),
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        const csv = [header.join(','), ...lines].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `access-log-${id}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    if (authLoading) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

    if (profile?.role !== 'admin') {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Acesso negado</AlertTitle>
                    <AlertDescription>Apenas administradores podem gerar relatórios de acesso LGPD.</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                    </Button>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <FileSearch className="h-7 w-7 text-brand" />
                        Log de Acesso — LGPD Art. 19
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Paciente: <span className="font-semibold text-foreground">{patientName ?? id}</span>
                    </p>
                </div>
                <Button variant="outline" onClick={exportCSV} disabled={rows.length === 0}>
                    <Download className="h-4 w-4 mr-2" /> Exportar CSV
                </Button>
            </div>

            <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Sobre este relatório</AlertTitle>
                <AlertDescription>
                    Este relatório lista todos os acessos e operações realizadas sobre os dados deste paciente,
                    conforme <strong>LGPD Art. 18, II e Art. 19</strong> (direito à informação sobre tratamento).
                    Retenção: 5 anos (exigência CFM).
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de acessos</CardTitle>
                    <CardDescription>
                        {loading ? 'Carregando…' : `${rows.length} registro${rows.length === 1 ? '' : 's'} (últimos 500).`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <Skeleton className="h-64 w-full" /> : (
                        <div className="border rounded-lg overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data / hora</TableHead>
                                        <TableHead>Ação</TableHead>
                                        <TableHead>Papel</TableHead>
                                        <TableHead>Recurso</TableHead>
                                        <TableHead>IP</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                Nenhum acesso registrado para este paciente ainda.
                                            </TableCell>
                                        </TableRow>
                                    ) : rows.map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-mono text-xs whitespace-nowrap">{fmt(r.created_at)}</TableCell>
                                            <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                                            <TableCell><Badge variant="secondary">{r.actor_role ?? 'system'}</Badge></TableCell>
                                            <TableCell className="text-xs">
                                                {r.resource_type}
                                                {r.resource_id ? <span className="text-muted-foreground"> · {r.resource_id.slice(0, 8)}…</span> : null}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono">{r.ip ?? '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
