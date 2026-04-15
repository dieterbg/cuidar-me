"use client";

import { useState, useMemo } from 'react';
import { format, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, CheckCircle, AlertTriangle, Calendar, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ScheduledMessage } from '@/lib/types';

interface ScheduledMessagesPanelProps {
    messages: ScheduledMessage[];
    currentDay?: number;
    durationDays?: number;
}

type FilterMode = 'all' | 'pending' | 'sent' | 'today' | 'week';

export function ScheduledMessagesPanel({ messages, currentDay, durationDays }: ScheduledMessagesPanelProps) {
    const [filter, setFilter] = useState<FilterMode>('pending');
    const [expandedDay, setExpandedDay] = useState<number | null>(null);

    // Stats
    const stats = useMemo(() => {
        const pending = messages.filter(m => m.status === 'pending').length;
        const sent = messages.filter(m => m.status === 'sent').length;
        const failed = messages.filter(m => m.errorInfo?.startsWith('FAILED')).length;
        return { pending, sent, failed, total: messages.length };
    }, [messages]);

    // Group by protocol day
    const groupedByDay = useMemo(() => {
        const groups = new Map<number, ScheduledMessage[]>();

        for (const msg of messages) {
            const day = (msg as any).metadata?.protocolDay || 0;
            if (!groups.has(day)) groups.set(day, []);
            groups.get(day)!.push(msg);
        }

        return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
    }, [messages]);

    // Filtered groups
    const filteredGroups = useMemo(() => {
        return groupedByDay.map(([day, msgs]) => {
            let filtered = msgs;
            const now = new Date();
            const weekFromNow = new Date(now);
            weekFromNow.setDate(weekFromNow.getDate() + 7);

            switch (filter) {
                case 'pending':
                    filtered = msgs.filter(m => m.status === 'pending');
                    break;
                case 'sent':
                    filtered = msgs.filter(m => m.status === 'sent');
                    break;
                case 'today':
                    filtered = msgs.filter(m => isToday(new Date(m.sendAt)));
                    break;
                case 'week':
                    filtered = msgs.filter(m => {
                        const d = new Date(m.sendAt);
                        return d >= now && d <= weekFromNow;
                    });
                    break;
            }
            return [day, filtered] as [number, ScheduledMessage[]];
        }).filter(([, msgs]) => msgs.length > 0);
    }, [groupedByDay, filter]);

    const filterButtons: { mode: FilterMode; label: string; count?: number }[] = [
        { mode: 'pending', label: 'Pendentes', count: stats.pending },
        { mode: 'today', label: 'Hoje' },
        { mode: 'week', label: '7 dias' },
        { mode: 'sent', label: 'Enviadas', count: stats.sent },
        { mode: 'all', label: 'Todas', count: stats.total },
    ];

    if (messages.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhuma mensagem agendada</p>
                    <p className="text-sm mt-1">As mensagens aparecerão aqui quando o protocolo for ativado.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total" value={stats.total} icon={<Calendar className="h-4 w-4" />} color="text-blue-600 bg-blue-50" />
                <StatCard label="Pendentes" value={stats.pending} icon={<Clock className="h-4 w-4" />} color="text-amber-600 bg-amber-50" />
                <StatCard label="Enviadas" value={stats.sent} icon={<CheckCircle className="h-4 w-4" />} color="text-green-600 bg-green-50" />
                {stats.failed > 0 && (
                    <StatCard label="Falhas" value={stats.failed} icon={<AlertTriangle className="h-4 w-4" />} color="text-red-600 bg-red-50" />
                )}
            </div>

            {/* Progress */}
            {currentDay && durationDays && (
                <div className="px-1">
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Dia {currentDay} de {durationDays}</span>
                        <span>{Math.round((currentDay / durationDays) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min((currentDay / durationDays) * 100, 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {filterButtons.map(({ mode, label, count }) => (
                    <Button
                        key={mode}
                        variant={filter === mode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter(mode)}
                        className="text-xs"
                    >
                        {label}
                        {count !== undefined && (
                            <span className="ml-1 opacity-70">({count})</span>
                        )}
                    </Button>
                ))}
            </div>

            {/* Message List grouped by day */}
            <div className="space-y-2">
                {filteredGroups.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            Nenhuma mensagem com este filtro.
                        </CardContent>
                    </Card>
                ) : (
                    filteredGroups.map(([day, msgs]) => (
                        <DayGroup
                            key={day}
                            day={day}
                            messages={msgs}
                            isCurrentDay={day === currentDay}
                            isExpanded={expandedDay === day}
                            onToggle={() => setExpandedDay(expandedDay === day ? null : day)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <Card>
            <CardContent className="p-3 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", color)}>
                    {icon}
                </div>
                <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function DayGroup({ day, messages, isCurrentDay, isExpanded, onToggle }: {
    day: number;
    messages: ScheduledMessage[];
    isCurrentDay: boolean;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const allSent = messages.every(m => m.status === 'sent');
    const hasPending = messages.some(m => m.status === 'pending');
    const sendDate = messages[0]?.sendAt ? new Date(messages[0].sendAt) : null;

    const dateLabel = sendDate
        ? isToday(sendDate) ? 'Hoje'
        : isTomorrow(sendDate) ? 'Amanhã'
        : format(sendDate, "dd/MM (EEEE)", { locale: ptBR })
        : '';

    return (
        <Card className={cn(
            "transition-colors",
            isCurrentDay && "ring-2 ring-primary/30",
            allSent && "opacity-60"
        )}>
            <button
                onClick={onToggle}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/50 rounded-t-lg transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                        isCurrentDay ? "bg-primary text-primary-foreground"
                        : allSent ? "bg-green-100 text-green-700"
                        : hasPending ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground"
                    )}>
                        {day}
                    </div>
                    <div>
                        <span className="font-medium text-sm">Dia {day}</span>
                        {dateLabel && (
                            <span className="text-xs text-muted-foreground ml-2">{dateLabel}</span>
                        )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                        {messages.length} msg{messages.length > 1 ? 's' : ''}
                    </Badge>
                    {isCurrentDay && (
                        <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                            Atual
                        </Badge>
                    )}
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isExpanded && (
                <CardContent className="pt-0 pb-3 px-4">
                    <div className="space-y-2 border-t pt-3">
                        {messages.map((msg) => (
                            <MessageRow key={msg.id} message={msg} />
                        ))}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

function MessageRow({ message }: { message: ScheduledMessage }) {
    const meta = (message as any).metadata || {};
    const title = meta.messageTitle || meta.checkinTitle || '';
    const isGamification = !!meta.isGamification;
    const sendAt = new Date(message.sendAt);
    const isSent = message.status === 'sent';
    const isFailed = message.errorInfo?.startsWith('FAILED');
    const timeStr = format(sendAt, 'HH:mm');

    return (
        <div className={cn(
            "flex items-start gap-3 p-2 rounded-lg text-sm",
            isSent && "bg-green-50/50",
            isFailed && "bg-red-50/50",
            !isSent && !isFailed && "bg-muted/30"
        )}>
            <div className="flex-shrink-0 mt-0.5">
                {isSent ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                ) : isFailed ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : (
                    <Clock className="h-4 w-4 text-amber-500" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{timeStr}</span>
                    {title && <span className="text-muted-foreground truncate">{title}</span>}
                    {isGamification && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            check-in
                        </Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {message.messageContent.substring(0, 120)}{message.messageContent.length > 120 ? '...' : ''}
                </p>
                {isFailed && message.errorInfo && (
                    <p className="text-xs text-red-500 mt-1">{message.errorInfo}</p>
                )}
            </div>
        </div>
    );
}
