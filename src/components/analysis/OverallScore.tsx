"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Brain, UserCheck } from "lucide-react"

interface OverallScoreProps {
    percentage: number
    assessment: string
}

export function OverallScore({ percentage, assessment }: OverallScoreProps) {
    const [animatedScore, setAnimatedScore] = useState(0)

    useEffect(() => {
        const duration = 1500;
        const start = performance.now();

        const animate = (time: number) => {
            const elapsed = time - start;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutExpo
            const easing = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            setAnimatedScore(Math.round(easing * percentage));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [percentage]);

    const isHighAi = percentage > 60;
    const colorClass = isHighAi ? "text-indigo-400" : "text-emerald-400";
    const Icon = isHighAi ? Brain : UserCheck;

    return (
        <Card className="overflow-hidden relative bg-black/40 border-white/5">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-50" />
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-slate-300 flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                    Probabilidad de IA Global
                </CardTitle>
                <CardDescription>Análisis estigmético y estadístico</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1 space-y-2 relative">
                        <div className="flex items-baseline gap-2">
                            <motion.span
                                className={`text-6xl font-black tracking-tighter ${colorClass} drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                {animatedScore}%
                            </motion.span>
                            <span className="text-xl text-slate-500 font-medium tracking-wide font-mono">IA</span>
                        </div>
                    </div>
                    <div className="flex-[2] bg-slate-900/50 rounded-lg p-5 border border-slate-800/50 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <p className="text-slate-300 leading-relaxed font-medium relative z-10 text-sm md:text-base">
                            "{assessment}"
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
