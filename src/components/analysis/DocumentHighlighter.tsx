"use client"

import { ParagraphSegment } from "@/lib/api/textAnalysis"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DocumentHighlighterProps {
    segments: ParagraphSegment[]
}

export function DocumentHighlighter({ segments }: DocumentHighlighterProps) {
    // Helper to get color intensity based on AI probability
    const getBackgroundColor = (prob: number) => {
        if (prob < 20) return "bg-emerald-500/[0.05] hover:bg-emerald-500/[0.1] border-l-emerald-500/20";
        if (prob < 40) return "bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05] border-l-transparent";
        if (prob < 60) return "bg-yellow-500/[0.05] hover:bg-yellow-500/[0.1] border-l-yellow-500/20";
        if (prob < 80) return "bg-purple-500/[0.1] hover:bg-purple-500/[0.15] border-l-purple-500/40";
        return "bg-rose-500/[0.15] hover:bg-rose-500/[0.2] border-l-rose-500/50";
    }

    const getTextColor = (prob: number) => {
        if (prob > 70) return "text-rose-100";
        if (prob > 40) return "text-slate-200";
        return "text-slate-300";
    }

    return (
        <div className="bg-black/20 rounded-xl border border-white/5 p-6 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
            <TooltipProvider delayDuration={200}>
                {segments.map((seg) => (
                    <Tooltip key={seg.id}>
                        <TooltipTrigger asChild>
                            <p
                                className={`
                  p-3 rounded-r-lg border-l-2 transition-colors duration-300 cursor-default
                  text-sm md:text-base leading-relaxed
                  ${getBackgroundColor(seg.aiProbability)}
                  ${getTextColor(seg.aiProbability)}
                `}
                            >
                                {seg.text}
                            </p>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs space-y-2">
                            <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-1">
                                <span className="font-semibold text-slate-200 text-sm">IA Probabilidad</span>
                                <span className={`font-mono text-sm ${seg.aiProbability > 60 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {seg.aiProbability}%
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-slate-400 block mb-0.5">Perplejidad</span>
                                    <span className="font-mono text-slate-300">{seg.metrics.perplexity.toFixed(1)}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block mb-0.5">Burstiness</span>
                                    <span className="font-mono text-slate-300">{seg.metrics.burstiness.toFixed(1)}</span>
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </TooltipProvider>
        </div>
    )
}
