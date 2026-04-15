"use client";

import { useState, useMemo } from 'react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, CheckCircle, AlertTriangle, Calendar, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
    const [filter, setFilter] = useState<FilterMode>('week');
    const [expandedDay, setExpandedDay] = useState<number | null>(currentDay || null);

    const stats = useMemo(() => {
        const now = new Date();
        const weekFromNow = new Date(now);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        const pending = messages.filter(m => m.status === 'pending').length;
        const sent = messages.filter(m => m.status === 'sent').length;
        const failed = messages.filter(m => m.errorInfo?.startsWith('FAILED')).length;
        const thisWeek = messages.filter(m => {
            const d = new Date(m.sendAt);
            return m.status === 'pending' && d >= now && d <= weekFromNow;
        }).length;
        const todayCount = messages.filter(m => isToday(new Date(m.sendAt))).length;
        return { pending, sent, failed, total: messages.length, thisWeek, todayCount };
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
        { mode: 'today', label: 'Hoje', count: stats.todayCount || undefined },
        { mode: 'week', label: '7 dias', count: stats.thisWeek || undefined },
        { mode: 'pending', label: 'Pendentes', count: stats.pending },
        { mode: 'sent', label: 'Enviadas', count: stats.sent },
        { mode: 'all', label: 'Todas' },
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
            {/* Stats + Progress */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard label="Total" value={stats.total} icon={<Calendar className="h-4 w-4" />} color="text-blue-600 bg-blue-50" />
                        <StatCard label="Pendentes" value={stats.pending} icon={<Clock className="h-4 w-4" />} color="text-amber-600 bg-amber-50" />
                        <StatCard label="Enviadas" value={stats.sent} icon={<CheckCircle className="h-4 w-4" />} color="text-green-600 bg-green-50" />
                        {stats.failed > 0 ? (
                            <StatCard label="Falhas" value={stats.failed} icon={<AlertTriangle className="h-4 w-4" />} color="text-red-600 bg-red-50" />
                        ) : (
                            <StatCard label="Esta semana" value={stats.thisWeek} icon={<Send className="h-4 w-4" />} color="text-violet-600 bg-violet-50" />
                        )}
                    </div>

                    {currentDay && durationDays && (
                        <div>
                            <div className="flex justify-between text-sm text-muted-foreground mb-1.5">
                                <span className="font-medium">Dia {currentDay} de {durationDays}</span>
                                <span>{Math.round(((currentDay - 1) / durationDays) * 100)}%</span>
                            </div>
                            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all"
                                    style={{ width: `${Math.min(((currentDay - 1) / durationDays) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

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
                    filteredGroups.map(([day, msgs]) => {
                        const isTodayGroup = msgs.some(m => isToday(new Date(m.sendAt)));
                        return (
                            <DayGroup
                                key={day}
                                day={day}
                                messages={msgs}
                                isCurrentDay={day === currentDay}
                                isTodayGroup={isTodayGroup}
                                isExpanded={expandedDay === day}
                                onToggle={() => setExpandedDay(expandedDay === day ? null : day)}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <div className={cn("flex items-center gap-3 p-3 rounded-xl border bg-background")}>
            <div className={cn("p-2 rounded-lg", color)}>
                {icon}
            </div>
            <div>
                <p className="text-xl font-bold leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            </div>
        </div>
    );
}

function DayGroup({ day, messages, isCurrentDay, isTodayGroup, isExpanded, onToggle }: {
    day: number;
    messages: ScheduledMessage[];
    isCurrentDay: boolean;
    isTodayGroup: boolean;
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
            "transition-all",
            isTodayGroup && "ring-2 ring-primary shadow-sm",
            isCurrentDay && !isTodayGroup && "ring-1 ring-primary/30",
            allSent && "opacity-50"
        )}>
            <button
                onClick={onToggle}
                className="w-full text-left p-3 sm:p-4 flex items-center justify-between hover:bg-muted/50 rounded-lg transition-colors"
            >
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        isTodayGroup ? "bg-primary text-primary-foreground"
                        : allSent ? "bg-green-100 text-green-700"
                        : hasPending ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground"
                    )}>
                        {day}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">Dia {day}</span>
                        {dateLabel && (
                            <span className="text-xs text-muted-foreground">{dateLabel}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">
                            {messages.length} msg{messages.length > 1 ? 's' : ''}
                        </Badge>
                        {isTodayGroup && (
                            <Badge className="text-xs bg-primary text-primary-foreground">
                                Hoje
                            </Badge>
                        )}
                        {isCurrentDay && !isTodayGroup && (
                            <Badge variant="secondary" className="text-xs">
                                Dia atual
                            </Badge>
                        )}
                    </div>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
            </button>

            {isExpanded && (
                <CardContent className="pt-0 pb-3 px-3 sm:px-4">
                    <div className="space-y-1.5 border-t pt-3">
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
    const isOverdue = !isSent && !isFailed && isPast(sendAt);
    const timeStr = format(sendAt, 'HH:mm');

    return (
        <div className={cn(
            "flex items-start gap-3 p-2.5 rounded-lg text-sm transition-colors",
            isSent && "bg-green-50/60",
            isFailed && "bg-red-50/60",
            isOverdue && "bg-orange-50/60",
            !isSent && !isFailed && !isOverdue && "bg-muted/30"
        )}>
            <div className="flex-shrink-0 mt-0.5">
                {isSent ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                ) : isFailed ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : isOverdue ? (
                    <Clock className="h-4 w-4 text-orange-500" />
                ) : (
                    <Clock className="h-4 w-4 text-amber-400" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-medium text-xs bg-muted px-1.5 py-0.5 rounded">{timeStr}</span>
                    {title && <span className="text-muted-foreground text-xs truncate max-w-[200px]">{title}</span>}
                    {isGamification && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600">
                            check-in
                        </Badge>
                    )}
                    {!isGamification && meta.messageTitle && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-600">
                            conteúdo
                        </Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {message.messageContent.substring(0, 150)}{message.messageContent.length > 150 ? '...' : ''}
                </p>
                {isFailed && message.errorInfo && (
                    <p className="text-xs text-red-500 mt-1">{message.errorInfo}</p>
                )}
            </div>
        </div>
    );
}
