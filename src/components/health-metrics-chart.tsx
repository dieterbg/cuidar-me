
"use client";

import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Area } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { HealthMetric } from '@/lib/types';
import { HeartPulse, Weight, Minus } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Skeleton } from './ui/skeleton';

interface HealthMetricsChartProps {
    metrics: HealthMetric[];
    patientHeight?: number | null;
}

const initialVisibility = {
    weight: true,
    bmi: false,
};

const chartConfig = {
    weight: { label: "Peso (kg)", color: "hsl(var(--chart-2))", icon: Weight },
    bmi: { label: "IMC", color: "hsl(var(--chart-4))", icon: Minus }
} satisfies ChartConfig;

export function HealthMetricsChart({ metrics, patientHeight }: HealthMetricsChartProps) {
    const [visibility, setVisibility] = useState(initialVisibility);

    const formattedData = useMemo(() => {
        return metrics.map(m => {
            let bmi = null;
            if (patientHeight && m.weight) {
                const heightInMeters = patientHeight / 100;
                if (heightInMeters > 0) {
                    bmi = parseFloat((m.weight / (heightInMeters * heightInMeters)).toFixed(1));
                }
            }
            return {
                date: new Date(m.date as string),
                dateFormatted: format(new Date(m.date as string), 'dd/MM'),
                weight: m.weight,
                bmi: bmi,
            };
        }).sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [metrics, patientHeight]);

    const hasBmiData = useMemo(() => formattedData.some(d => d.bmi), [formattedData]);
    const hasData = formattedData.length > 0;
    
    if (!hasData) {
         return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HeartPulse className="h-6 w-6 text-primary" />
                        Métricas de Saúde
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] flex items-center justify-center">
                    <p className="text-muted-foreground">Nenhuma métrica registrada para este paciente ainda.</p>
                </CardContent>
            </Card>
        );
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HeartPulse className="h-6 w-6 text-primary" />
                    Métricas de Saúde
                </CardTitle>
                <CardDescription>Evolução das métricas do paciente. Use as caixas de seleção para mostrar ou ocultar uma linha.</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ComposedChart data={formattedData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="dateFormatted"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => value}
                        />
                         <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    indicator="dot"
                                    labelFormatter={(label, payload) => {
                                        const date = payload[0]?.payload?.date;
                                        return date ? format(date, "eeee, dd 'de' MMMM", { locale: ptBR }) : label;
                                    }}
                                />
                            }
                        />
                        <Legend />
                        
                        {visibility.weight && (
                             <Line dataKey="weight" type="monotone" stroke="var(--color-weight)" strokeWidth={2} dot={{ fill: "var(--color-weight)" }} activeDot={{ r: 6 }} yAxisId="weight-axis" />
                        )}
                        {hasBmiData && visibility.bmi && (
                             <Line dataKey="bmi" type="monotone" stroke="var(--color-bmi)" strokeWidth={2} dot={{ fill: "var(--color-bmi)" }} activeDot={{ r: 6 }} yAxisId="bmi-axis" />
                        )}
                        
                        <YAxis yAxisId="weight-axis" domain={['dataMin - 2', 'dataMax + 2']} hide={!visibility.weight} />
                        <YAxis yAxisId="bmi-axis" orientation="right" domain={['dataMin - 2', 'dataMax + 2']} hide={!visibility.bmi} />

                    </ComposedChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-x-6 gap-y-2 items-center justify-center">
                 <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setVisibility(v => ({...v, weight: !v.weight}))}>
                    <Checkbox id="weight" checked={visibility.weight} />
                    <Label htmlFor="weight" className="text-sm font-medium cursor-pointer" style={{ color: "hsl(var(--chart-2))" }}>
                        Peso (kg)
                    </Label>
                </div>
                 {hasBmiData && (
                    <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setVisibility(v => ({...v, bmi: !v.bmi}))}>
                        <Checkbox id="bmi" checked={visibility.bmi} />
                        <Label htmlFor="bmi" className="text-sm font-medium cursor-pointer" style={{ color: "hsl(var(--chart-4))" }}>
                            IMC
                        </Label>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}

    
