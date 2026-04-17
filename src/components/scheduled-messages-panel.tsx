"use client";

import { useState, useMemo, useTransition } from 'react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, CheckCircle, AlertTriangle, Calendar, ChevronDown, ChevronUp, Send, Pencil, X, Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ScheduledMessage } from '@/lib/types';
import { rescheduleMessage } from '@/ai/actions/messages';

interface ScheduledMessagesPanelProps {
    messages: ScheduledMessage[];
    currentDay?: number;
    durationDays?: number;
}

type FilterMode = 'all' | 'pending' | 'sent' | 'today' | 'week';

export function ScheduledMessagesPanel({ messages: initialMessages, currentDay, durationDays }: ScheduledMessagesPanelProps) {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const [filter, setFilter] = useState<FilterMode>('week');
    // Expand today's group by default
    const [expandedDateKey, setExpandedDateKey] = useState<string | null>(todayKey);
    // Local copy so optimistic updates work without page reload
    const [messages, setMessages] = useState<ScheduledMessage[]>(initialMessages);

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

    // Group by send_at calendar date (local timezone) — so rescheduling moves messages between groups
    const groupedByDate = useMemo(() => {
        const groups = new Map<string, ScheduledMessage[]>();
        for (const msg of messages) {
            const dateKey = format(new Date(msg.sendAt), 'yyyy-MM-dd');
            if (!groups.has(dateKey)) groups.set(dateKey, []);
            groups.get(dateKey)!.push(msg);
        }
        // Sort by date ascending, then sort messages within each group by time
        return Array.from(groups.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([dateKey, msgs]) => [
                dateKey,
                [...msgs].sort((a, b) => new Date(a.sendAt).getTime() - new Date(b.sendAt).getTime()),
            ] as [string, ScheduledMessage[]]);
    }, [messages]);

    // Apply filter within each date group
    const filteredGroups = useMemo(() => {
        return groupedByDate.map(([dateKey, msgs]) => {
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
            return [dateKey, filtered] as [string, ScheduledMessage[]];
        }).filter(([, msgs]) => msgs.length > 0);
    }, [groupedByDate, filter]);

    const filterButtons: { mode: FilterMode; label: string; count?: number }[] = [
        { mode: 'today', label: 'Hoje', count: stats.todayCount || undefined },
        { mode: 'week', label: '7 dias', count: stats.thisWeek || undefined },
        { mode: 'pending', label: 'Pendentes', count: stats.pending },
        { mode: 'sent', label: 'Enviadas', count: stats.sent },
        { mode: 'all', label: 'Todas' },
    ];

    // Called by MessageRow after successful reschedule — moves message to new date group
    const handleRescheduled = (msgId: string, newSendAt: string) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, sendAt: newSendAt } : m));
        // Auto-expand the new date's group
        const newDateKey = format(new Date(newSendAt), 'yyyy-MM-dd');
        setExpandedDateKey(newDateKey);
    };

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

            {/* Message list grouped by calendar date */}
            <div className="space-y-2">
                {filteredGroups.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            Nenhuma mensagem com este filtro.
                        </CardContent>
                    </Card>
                ) : (
                    filteredGroups.map(([dateKey, msgs]) => (
                        <DateGroup
                            key={dateKey}
                            dateKey={dateKey}
                            messages={msgs}
                            isExpanded={expandedDateKey === dateKey}
                            onToggle={() => setExpandedDateKey(expandedDateKey === dateKey ? null : dateKey)}
                            onRescheduled={handleRescheduled}
                        />
                    ))
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

function DateGroup({ dateKey, messages, isExpanded, onToggle, onRescheduled }: {
    dateKey: string;
    messages: ScheduledMessage[];
    isExpanded: boolean;
    onToggle: () => void;
    onRescheduled: (msgId: string, newSendAt: string) => void;
}) {
    const date = new Date(dateKey + 'T12:00:00'); // noon to avoid timezone shift
    const allSent = messages.every(m => m.status === 'sent');
    const hasPending = messages.some(m => m.status === 'pending');
    const isDateToday = isToday(date);

    const dateLabel = isDateToday ? 'Hoje'
        : isTomorrow(date) ? 'Amanhã'
        : format(date, "dd/MM (EEEE)", { locale: ptBR });

    // Collect unique protocol days in this date group (for display)
    const protocolDays = [...new Set(
        messages.map(m => (m as any).metadata?.protocolDay).filter(Boolean)
    )].sort((a, b) => a - b);

    const dayRangeLabel = protocolDays.length > 0
        ? protocolDays.length === 1
            ? `Dia ${protocolDays[0]}`
            : `Dias ${protocolDays[0]}–${protocolDays[protocolDays.length - 1]}`
        : null;

    return (
        <Card className={cn(
            "transition-all",
            isDateToday && "ring-2 ring-primary shadow-sm",
            allSent && "opacity-50"
        )}>
            <button
                onClick={onToggle}
                className="w-full text-left p-3 sm:p-4 flex items-center justify-between hover:bg-muted/50 rounded-lg transition-colors"
            >
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Day-of-month avatar */}
                    <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        isDateToday ? "bg-primary text-primary-foreground"
                        : allSent ? "bg-green-100 text-green-700"
                        : hasPending ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground"
                    )}>
                        {date.getDate()}
                    </div>

                    <div className="flex flex-col">
                        <span className="font-medium text-sm">{dateLabel}</span>
                        {dayRangeLabel && (
                            <span className="text-xs text-muted-foreground">{dayRangeLabel}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">
                            {messages.length} msg{messages.length > 1 ? 's' : ''}
                        </Badge>
                        {isDateToday && (
                            <Badge className="text-xs bg-primary text-primary-foreground">
                                Hoje
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
                            <MessageRow key={msg.id} message={msg} onRescheduled={onRescheduled} />
                        ))}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

// Returns "YYYY-MM-DDTHH:MM" local time string for datetime-local input
function toLocalDateTimeValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function MessageRow({ message, onRescheduled }: {
    message: ScheduledMessage;
    onRescheduled: (msgId: string, newSendAt: string) => void;
}) {
    const meta = (message as any).metadata || {};
    const title = meta.messageTitle || meta.checkinTitle || '';
    const isGamification = !!meta.isGamification;
    const protocolDay = meta.protocolDay as number | undefined;
    const sendAt = new Date(message.sendAt);
    const isSent = message.status === 'sent';
    const isFailed = message.errorInfo?.startsWith('FAILED');
    const isOverdue = !isSent && !isFailed && isPast(sendAt);
    const timeStr = format(sendAt, 'HH:mm');

    const [editing, setEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();

    const openEdit = () => {
        // Use the current scheduled time if it's in the future (getTime() for safety)
        // otherwise default to now + 11 minutes
        const now = new Date();
        const initialDate = sendAt.getTime() > now.getTime() ? sendAt : new Date(now.getTime() + 11 * 60 * 1000);
        
        const defaultTime = new Date(initialDate);
        defaultTime.setSeconds(0, 0);
        
        setInputValue(toLocalDateTimeValue(defaultTime));
        setError('');
        setEditing(true);
    };

    const handleSave = () => {
        if (!inputValue) { setError('Selecione um horário.'); return; }
        const selected = new Date(inputValue);
        const minTime = new Date(Date.now() + 10 * 60 * 1000);
        if (selected < minTime) {
            setError('Mínimo: 10 minutos a partir de agora.');
            return;
        }
        setError('');
        startTransition(async () => {
            const result = await rescheduleMessage(message.id, selected.toISOString());
            if (result.success) {
                onRescheduled(message.id, selected.toISOString());
                setEditing(false);
            } else {
                setError(result.error || 'Erro ao reagendar.');
            }
        });
    };

    const minDateTimeLocal = toLocalDateTimeValue(new Date(Date.now() + 10 * 60 * 1000));

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
                    {protocolDay && (
                        <span className="text-[10px] text-muted-foreground font-medium">Dia {protocolDay}</span>
                    )}
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

                {editing && (
                    <div className="mt-2 p-2 bg-background border rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                            <p className="text-xs font-medium text-foreground">Reagendar para:</p>
                            <span className="text-[10px] text-muted-foreground">
                                Atual: {format(sendAt, "dd/MM 'às' HH:mm")}
                            </span>
                        </div>
                        <input
                            type="datetime-local"
                            value={inputValue}
                            min={minDateTimeLocal}
                            onChange={e => { setInputValue(e.target.value); setError(''); }}
                            className="w-full text-xs border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            disabled={isPending}
                        />
                        {error && <p className="text-xs text-red-500">{error}</p>}
                        <div className="flex gap-1.5">
                            <Button
                                size="sm"
                                className="h-7 text-xs px-3"
                                onClick={handleSave}
                                disabled={isPending}
                            >
                                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                <span className="ml-1">{isPending ? 'Salvando...' : 'Confirmar'}</span>
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2"
                                onClick={() => setEditing(false)}
                                disabled={isPending}
                            >
                                <X className="h-3 w-3" />
                                Cancelar
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {!isSent && !editing && (
                <button
                    onClick={openEdit}
                    className="flex-shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                    title="Reagendar"
                >
                    <Pencil className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}
