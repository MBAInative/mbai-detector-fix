"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FeatureScore } from "@/lib/api/textAnalysis"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle2, Info, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FeatureReportProps {
    features: FeatureScore[]
    overallScore: number
    qualitativeAssessment: string
}

export function FeatureReport({ features, overallScore, qualitativeAssessment }: FeatureReportProps) {

    const handlePrint = () => {
        window.print()
    }

    return (
        <Card className="h-full bg-black/40 border-white/5 relative overflow-hidden">
            <CardHeader className="pb-3 border-b border-white/5 mb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg text-slate-200">Desglose de Características</CardTitle>
                        <CardDescription>Factores clave que influyen en la detección</CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-medium print:hidden"
                    >
                        <FileText className="w-4 h-4 mr-2 text-indigo-400" />
                        Generar Informe PDF
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {features.map((feature, idx) => (
                    <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                {feature.isAiIndicator ? (
                                    <AlertCircle className="w-4 h-4 text-rose-400" />
                                ) : feature.score < 40 ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                    <Info className="w-4 h-4 text-slate-400" />
                                )}
                                {feature.name}
                            </span>
                            <span className="text-xs font-mono text-slate-500">{feature.score}/100</span>
                        </div>

                        <Progress
                            value={feature.score}
                            className="h-2 bg-slate-900/80 border border-slate-800/50"
                            indicatorColor={feature.isAiIndicator ? "bg-rose-500/80" : "bg-indigo-500/80"}
                        />

                        <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/30 p-2 text-justify rounded border left-border border-l-2 border-slate-800 border-l-indigo-500/50">
                            {feature.description}
                        </p>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
