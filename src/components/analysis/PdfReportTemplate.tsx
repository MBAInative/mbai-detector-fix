"use client"

import { FeatureScore } from "@/lib/api/textAnalysis"

interface PdfReportProps {
    features: FeatureScore[]
    overallScore: number
    qualitativeAssessment: string
}

const explanations: Record<string, string> = {
    "Diversidad Léxica (25%)": "¿Qué amplitud de vocabulario tiene el texto? Si se repiten mucho las mismas palabras, es síntoma de que una IA está escribiendo de forma matemática. Los humanos usamos más sinónimos u omitimos palabras.",
    "Morfosintaxis y Verbos (20%)": "Las IA escriben como enciclopedias: usan muchísimos sustantivos (nombres) y pocos verbos de acción ('estilo nominal'). Un humano emplea verbos dinámicos que le dan vida al relato.",
    "Perplejidad / Oraciones (15%)": "¿Las frases miden todas casi lo mismo o cambian bruscamente de tamaño? Las máquinas construyen párrafos muy simétricos. Los humanos somos arrítmicos: escribimos frases muy largas seguidas de cortas.",
    "Uniformidad Sintáctica (15%)": "¿El texto respira siempre igual? Las IA colocan las comas con una perfección repetitiva. Los humanos cambian constantemente la estructura geométrica visual de los párrafos.",
    "Semántica y Entidades (15%)": "Cuando una IA menciona a 'Pedro', tiende a repetir su nombre completo muchas veces para no perder el hilo estadístico. Un humano usaría más pronombres ('él').",
    "Marcadores y Modismos (10%)": "Busca palabras cliché que la IA usa para dar énfasis emocional ('En conclusión', 'Es crucial', 'Onda de choque'). Se compara contra modismos reales humanos ('Tira y afloja').",
    "Densidad de Adverbios / Conectores (10%)": "La IA apenas usa adverbios ('rápidamente') porque le cuesta dar matices humanos, pero por el contrario abusa de los conectores lógicos ('Sin embargo', 'Por ello') para pegar sus ideas.",
    "Índice de Voz Pasiva (10%)": "La IA intenta sonar neutral y 'no mojarse', por lo que borra al sujeto usando voz pasiva ('Se considera que', 'El acuerdo fue firmado'). Un humano suele mojarse usando voz activa ('Ellos consideran que').",
    "Entropía de N-Gramas (5%)": "¿Hay pequeños 'ecos' en el texto? A veces las IA como Gemini se traban un poco interconectando sus vectores y repiten bloques exactos de 2 o 3 palabras sin darse cuenta.",
    "Índice de Mitigación (Hedging) (5%)": "A la IA le han enseñado a ser hiper-cortés vía RLHF. Por eso llenan los textos de advertencias suaves como 'es importante destacar' o 'puede ser útil'. Esto delata inmediatamente su código."
};

export function PdfReportTemplate({ features, overallScore, qualitativeAssessment }: PdfReportProps) {
    const isAi = overallScore > 50

    return (
        <div className="w-[800px] bg-white text-slate-900 p-12 font-sans">
            <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2">MBAI Native Analytics</h1>
                    <p className="text-sm text-slate-500 font-medium">Informe Pericial Lingüístico (10 Vectores M-PDS)</p>
                </div>
                <div className="text-right text-xs text-slate-400 font-mono">
                    ID: {Date.now().toString(36).toUpperCase()}<br />
                    {new Date().toLocaleDateString('es-ES')}
                </div>
            </div>

            <div className="mb-10 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h2 className="text-lg font-bold mb-4 text-slate-700 uppercase tracking-wider">Veredicto Global</h2>
                <div className="flex items-center gap-8">
                    <div className="text-7xl font-black tabular-nums tracking-tighter" style={{ color: isAi ? '#e11d48' : '#059669' }}>
                        {overallScore}%<span className="text-2xl ml-2 text-slate-400 font-bold tracking-normal">{isAi ? 'IA' : 'Humano'}</span>
                    </div>
                    <div className="text-lg font-medium italic text-slate-700 leading-relaxed border-l-4 pl-6 py-2" style={{ borderColor: isAi ? '#fde4e8' : '#d1fae5' }}>
                        "{qualitativeAssessment}"
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <h2 className="text-xl font-bold mb-2 text-slate-800">Desglose de Parámetros Heurísticos</h2>
                <p className="text-sm text-slate-500 mb-6 font-medium">
                    Hemos descompuesto el texto original en 10 parámetros lingüísticos independientes. Cada uno recibe una puntuación del 0 al 100 indicando su nivel algorítmico frente a redacción humana orgánica.
                </p>

                <div className="space-y-4">
                    {features.map((f, i) => (
                        <div key={i} className="border border-slate-200 rounded-lg p-4 relative overflow-hidden bg-white">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: f.isAiIndicator ? '#e11d48' : '#059669' }} />
                            <div className="ml-3">
                                <div className="flex justify-between items-center mb-1.5">
                                    <h3 className="font-bold text-base text-slate-800">{f.name}</h3>
                                    <span className="font-mono bg-slate-50 px-2.5 py-1 rounded text-xs font-bold border border-slate-200 text-slate-700">
                                        Puntuación: {f.score}/100
                                    </span>
                                </div>
                                <div className="text-sm text-slate-700 mb-2 leading-relaxed">
                                    {explanations[f.name] || f.description}
                                </div>
                                <div className="text-xs text-slate-400 bg-slate-50 p-2 rounded italic border border-slate-100 flex gap-2 items-start">
                                    <span className="font-semibold text-slate-500">Métrica Técnica:</span>
                                    <span>{f.description}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-12 pt-6 border-t border-slate-200 text-xs text-center text-slate-400 font-medium">
                Documento generado localmente y de forma segura por el motor MBAI Native • Cero retención de datos en la nube.
            </div>
        </div>
    )
}
