"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    UploadCloud, FileText, ArrowRight, Activity, Loader2,
    Sparkles, AlertTriangle, HelpCircle, X, Download,
    Layers, CheckCircle2, FileDown
} from "lucide-react"
import * as XLSX from "xlsx"

import { analyzeDocument, AnalysisResponse, pingBackend } from "@/lib/api/textAnalysis"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

import { OverallScore } from "@/components/analysis/OverallScore"
import { FeatureReport } from "@/components/analysis/FeatureReport"
import { DocumentHighlighter } from "@/components/analysis/DocumentHighlighter"
import { PdfReportTemplate } from "@/components/analysis/PdfReportTemplate"

interface BatchFileStatus {
    file: File;
    status: "waiting" | "extracting" | "analyzing" | "done" | "error";
    results?: AnalysisResponse;
    errorMessage?: string;
}

export default function Home() {
    // Individual Mode State
    const [inputText, setInputText] = useState("")
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isWakingUp, setIsWakingUp] = useState(false)
    const [isModelLoading, setIsModelLoading] = useState(false)
    const [isExtracting, setIsExtracting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [results, setResults] = useState<AnalysisResponse | null>(null)
    const [showHelp, setShowHelp] = useState(false)

    // Batch Mode State
    const [isBatchMode, setIsBatchMode] = useState(false)
    const [batchFiles, setBatchFiles] = useState<BatchFileStatus[]>([])
    const [isProcessingBatch, setIsProcessingBatch] = useState(false)
    const [batchProgress, setBatchProgress] = useState(0)

    const handleAnalyze = async () => {
        if (!inputText.trim()) {
            setError("Por favor, introduce o sube un texto para analizar.")
            return
        }

        if (inputText.length > 10000) {
            setInputText(inputText.substring(0, 10000))
            setError("Documento extenso detectado. Para estabilidad del servidor gratuito, se han analizado los primeros 10.000 caracteres.")
        }

        setError(null)
        setIsAnalyzing(true)

        try {
            await ensureBackendReady()
            const data = await analyzeDocument(inputText)
            setResults(data)
        } catch (err: any) {
            console.error("Analysis error:", err)
            setError(err.message || "Error de conexión con el motor MBAI nativo.")
        } finally {
            setIsAnalyzing(false)
            setIsWakingUp(false)
            setIsModelLoading(false)
        }
    }

    const ensureBackendReady = async () => {
        setIsWakingUp(true)
        let isServerUp = false
        let isModelReady = false
        let attempts = 0
        const maxAttempts = 30

        while (!isModelReady && attempts < maxAttempts) {
            const status = await pingBackend()
            isServerUp = status.ok
            isModelReady = status.ready

            if (isServerUp && !isModelReady) {
                setIsWakingUp(false)
                setIsModelLoading(true)
            }

            if (!isModelReady) {
                attempts++
                await new Promise(resolve => setTimeout(resolve, 8000))
            }
        }

        if (!isModelReady) {
            throw new Error(isServerUp
                ? "El motor ha despertado pero las redes doctrinales tardan en cargar. Por favor, reintenta en 10 segundos."
                : "El motor de IA de Render no responde. Puede estar saturado o en mantenimiento.")
        }

        setIsWakingUp(false)
        setIsModelLoading(false)
    }

    const extractTextFromFile = async (file: File): Promise<string> => {
        const ext = file.name.toLowerCase().split('.').pop()
        let text = ""

        if (ext === "txt" || ext === "md") {
            text = await file.text()
        } else if (ext === "pdf") {
            const pdfjsLib = await import("pdfjs-dist")
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

            const arrayBuffer = await file.arrayBuffer()
            const pdfDocument = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise

            let fullText = ""
            const pagesToProcess = Math.min(pdfDocument.numPages, 10)
            for (let i = 1; i <= pagesToProcess; i++) {
                const page = await pdfDocument.getPage(i)
                const textContent = await page.getTextContent()
                const pageText = textContent.items.map((item: any) => item.str).join(" ")
                fullText += pageText + "\n"
            }
            text = fullText.trim()
        } else if (ext === "docx") {
            const mammoth = (await import("mammoth")).default
            const arrayBuffer = await file.arrayBuffer()
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer })
            text = result.value
        } else {
            throw new Error("Formato no soportado")
        }

        return text.substring(0, 10000) // Truncamiento de seguridad
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsExtracting(true)
        setError(null)
        setInputText("")

        try {
            const text = await extractTextFromFile(file)
            setInputText(text)
        } catch (err: any) {
            console.error("Extraction error:", err)
            setError(err.message || "Error al leer o extraer el texto del archivo.")
        } finally {
            setIsExtracting(false)
            e.target.value = ""
        }
    }

    // --- BATCH MODE LOGIC ---
    const handleBatchFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        const newBatch = files.map(file => ({
            file,
            status: "waiting" as const
        }))

        setBatchFiles(prev => [...prev, ...newBatch])
        e.target.value = ""
    }

    const removeBatchFile = (index: number) => {
        setBatchFiles(prev => prev.filter((_, i) => i !== index))
    }

    const processBatch = async () => {
        if (batchFiles.length === 0 || isProcessingBatch) return

        setIsProcessingBatch(true)
        setBatchProgress(0)

        try {
            // Asegurar que el backend esté despierto primero
            await ensureBackendReady()

            for (let i = 0; i < batchFiles.length; i++) {
                // Si el archivo ya está hecho, saltar
                if (batchFiles[i].status === "done") continue

                setBatchFiles(prev => {
                    const next = [...prev]
                    next[i].status = "extracting"
                    return next
                })

                try {
                    const text = await extractTextFromFile(batchFiles[i].file)

                    setBatchFiles(prev => {
                        const next = [...prev]
                        next[i].status = "analyzing"
                        return next
                    })

                    const results = await analyzeDocument(text)

                    setBatchFiles(prev => {
                        const next = [...prev]
                        next[i].status = "done"
                        next[i].results = results
                        return next
                    })
                } catch (err: any) {
                    setBatchFiles(prev => {
                        const next = [...prev]
                        next[i].status = "error"
                        next[i].errorMessage = err.message
                        return next
                    })
                }

                setBatchProgress(Math.round(((i + 1) / batchFiles.length) * 100))
            }
        } catch (err: any) {
            setError("Fallo crítico en el procesamiento por lotes: " + err.message)
        } finally {
            setIsProcessingBatch(false)
        }
    }

    const downloadXlsx = () => {
        const completed = batchFiles.filter(f => f.status === "done" && f.results)
        if (completed.length === 0) return

        const rows = completed.map(f => {
            const r = f.results!
            const features = r.features.reduce((acc: any, feat) => {
                acc[feat.name] = feat.score
                return acc
            }, {})

            return {
                "Archivo": f.file.name,
                "Probabilidad IA (%)": r.overallAiPercentage,
                "Evaluación Cualitativa": r.qualitativeAssessment,
                "Tamaño (bytes)": f.file.size,
                "Tipo": f.file.type,
                ...features
            }
        })

        const worksheet = XLSX.utils.json_to_sheet(rows)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Análisis MBAI")
        XLSX.writeFile(workbook, `MBAI_Analisis_Lotes_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    const handleReset = () => {
        setResults(null)
        setInputText("")
        setBatchFiles([])
        setBatchProgress(0)
    }

    return (
        <>
            <main className="min-h-screen p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 print:hidden">
                {/* Header */}
                <header className="flex flex-col items-center justify-center space-y-4 pt-8 pb-12 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm font-medium mb-4"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>MBAI Native Analytics</span>
                    </motion.div>

                    <motion.h1
                        className="text-4xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-lg"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        Detector de Escritura <span className="text-gradient">IA vs Humano</span>
                    </motion.h1>

                    <motion.p
                        className="text-slate-400 max-w-2xl text-lg mt-4 leading-relaxed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        Desarrollado según la doctrina MBAI para directivos de empresas nativas en inteligencia artificial. Analiza estigmética y métricas probabilísticas profundas.
                    </motion.p>

                    <div className="flex gap-4 mt-6">
                        <Button
                            variant={isBatchMode ? "ghost" : "premium"}
                            size="sm"
                            onClick={() => { setIsBatchMode(false); setResults(null); }}
                            className={!isBatchMode ? "shadow-lg shadow-indigo-500/20" : "text-slate-400"}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Modo Individual
                        </Button>
                        <Button
                            variant={isBatchMode ? "premium" : "ghost"}
                            size="sm"
                            onClick={() => { setIsBatchMode(true); setResults(null); }}
                            className={isBatchMode ? "shadow-lg shadow-indigo-500/20" : "text-slate-400"}
                        >
                            <Layers className="w-4 h-4 mr-2" />
                            Modo Lotes (Batch)
                        </Button>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {!isBatchMode ? (
                        // --- INDIVIDUAL MODE (ORIGINAL) ---
                        !results ? (
                            <motion.div
                                key="input-view"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="max-w-3xl mx-auto w-full"
                            >
                                <Card className="glass overflow-hidden">
                                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                                    <CardHeader className="pt-8">
                                        <CardTitle className="text-2xl text-slate-100">Analizar nuevo documento</CardTitle>
                                        <CardDescription>
                                            Sube un archivo .txt o pega el contenido directamente para procesar sus características algorítmicas.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {error && (
                                            <div className="bg-rose-500/10 border border-rose-500/50 rounded-md p-3 flex items-start gap-3">
                                                <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                                                <p className="text-sm text-rose-200">{error}</p>
                                            </div>
                                        )}
                                        <Tabs defaultValue="upload" className="w-full">
                                            <TabsList className="w-full grid grid-cols-2 mb-6 h-12">
                                                <TabsTrigger value="paste" className="h-10 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    Pegar Texto
                                                </TabsTrigger>
                                                <TabsTrigger value="upload" className="h-10 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                                    <UploadCloud className="w-4 h-4 mr-2" />
                                                    Subir Archivo
                                                </TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="paste" className="space-y-4">
                                                <Textarea
                                                    id="text-input"
                                                    placeholder="Escribe o pega el texto aquí..."
                                                    className="min-h-[250px] resize-y text-base"
                                                    value={inputText}
                                                    onChange={(e) => setInputText(e.target.value)}
                                                />
                                            </TabsContent>
                                            <TabsContent value="upload">
                                                <div className="border-2 border-dashed border-slate-700/50 rounded-xl p-12 flex flex-col items-center justify-center text-center bg-slate-900/20 hover:bg-slate-900/40 transition-colors group cursor-pointer relative">
                                                    <input
                                                        type="file"
                                                        accept=".txt,.md,.pdf,.docx"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                        onChange={handleFileUpload}
                                                        disabled={isExtracting}
                                                    />
                                                    <div className="bg-indigo-500/10 p-4 rounded-full mb-4 group-hover:bg-indigo-500/20 transition-colors">
                                                        <UploadCloud className="w-8 h-8 text-indigo-400" />
                                                    </div>
                                                    <h3 className="font-medium text-slate-200 text-lg mb-1">Arrastra un archivo</h3>
                                                    <p className="text-slate-400 text-sm">Soporta .pdf, .docx, .txt y .md</p>
                                                    {isExtracting && (
                                                        <div className="mt-4 flex items-center text-sm text-indigo-400 animate-pulse">
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Extrayendo...
                                                        </div>
                                                    )}
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                    <CardFooter className="bg-slate-900/50 border-t border-white/5 p-6">
                                        <Button
                                            onClick={handleAnalyze}
                                            disabled={isAnalyzing}
                                            variant="premium"
                                            size="lg"
                                            className="w-full text-base font-semibold"
                                        >
                                            {isWakingUp ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Despertando motor IA...</> :
                                                isModelLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Calibrando redes...</> :
                                                    isAnalyzing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Ejecutando Peritaje...</> :
                                                        <><Activity className="mr-2 h-5 w-5" /> Ejecutar Análisis Profundo</>}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ) : (
                            // RESULTS VIEW
                            <motion.div
                                key="results-view"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full space-y-8"
                            >
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <Activity className="w-6 h-6 text-indigo-400" />
                                        Resultados del Análisis
                                    </h2>
                                    <Button onClick={handleReset} variant="outline" size="sm" className="bg-slate-900 border-slate-700">
                                        Analizar otro documento
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-1 space-y-6">
                                        <OverallScore percentage={results.overallAiPercentage} assessment={results.qualitativeAssessment} />
                                        <FeatureReport features={results.features} overallScore={results.overallAiPercentage} qualitativeAssessment={results.qualitativeAssessment} />
                                    </div>
                                    <div className="lg:col-span-2">
                                        <Card className="h-full glass flex flex-col">
                                            <CardHeader className="pb-4 border-b border-white/5">
                                                <CardTitle className="text-xl text-slate-100">Inspección Forense</CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex-1 p-6">
                                                <DocumentHighlighter segments={results.segments} />
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    ) : (
                        // --- BATCH MODE (NEW) ---
                        <motion.div
                            key="batch-view"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-4xl mx-auto w-full space-y-8"
                        >
                            <Card className="glass overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-2xl text-slate-100 flex items-center h-8">
                                        <Layers className="w-6 h-6 mr-2 text-indigo-400" />
                                        Procesamiento por Lotes
                                    </CardTitle>
                                    <CardDescription>
                                        Selecciona múltiples documentos para un análisis masivo. Al finalizar, podrás exportar un reporte consolidado en XLSX.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="border-2 border-dashed border-slate-700/50 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-900/20 hover:bg-slate-900/40 transition-colors group cursor-pointer relative">
                                        <input
                                            type="file"
                                            multiple
                                            accept=".txt,.md,.pdf,.docx"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={handleBatchFiles}
                                            disabled={isProcessingBatch}
                                        />
                                        <UploadCloud className="w-10 h-10 text-indigo-400 mb-2" />
                                        <h3 className="font-medium text-slate-200">Añadir archivos al lote</h3>
                                        <p className="text-slate-400 text-xs mt-1">Soporta múltiples PDFs, DOCX, TXT</p>
                                    </div>

                                    {batchFiles.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-400">{batchFiles.length} archivos en lista</span>
                                                {isProcessingBatch && (
                                                    <span className="text-indigo-400 font-medium">Procesando: {batchProgress}%</span>
                                                )}
                                            </div>

                                            {isProcessingBatch && <Progress value={batchProgress} className="h-2 bg-slate-800" />}

                                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                {batchFiles.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40 border border-white/5">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className={`p-2 rounded-md ${item.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' :
                                                                    item.status === 'error' ? 'bg-rose-500/10 text-rose-400' :
                                                                        'bg-slate-800 text-slate-400'
                                                                }`}>
                                                                {item.status === 'done' ? <CheckCircle2 className="w-4 h-4" /> :
                                                                    item.status === 'error' ? <AlertTriangle className="w-4 h-4" /> :
                                                                        item.status === 'analyzing' || item.status === 'extracting' ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> :
                                                                            <FileText className="w-4 h-4" />}
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <p className="text-sm font-medium text-slate-200 truncate">{item.file.name}</p>
                                                                <p className="text-[10px] text-slate-500">
                                                                    {item.status === 'waiting' && 'Esperando...'}
                                                                    {item.status === 'extracting' && 'Extrayendo texto...'}
                                                                    {item.status === 'analyzing' && 'Analizando con IA...'}
                                                                    {item.status === 'done' && `Calificación: ${item.results?.overallAiPercentage}% IA`}
                                                                    {item.status === 'error' && `Error: ${item.errorMessage}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {!isProcessingBatch && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-slate-500 hover:text-rose-400"
                                                                onClick={() => removeBatchFile(idx)}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="bg-slate-900/50 border-t border-white/5 p-6 flex gap-3">
                                    <Button
                                        onClick={processBatch}
                                        disabled={isProcessingBatch || batchFiles.length === 0}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                                    >
                                        {isProcessingBatch ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Procesando Lote...
                                            </>
                                        ) : (
                                            <>
                                                <Activity className="mr-2 h-4 w-4" />
                                                Iniciar Análisis Masivo
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        onClick={downloadXlsx}
                                        disabled={isProcessingBatch || !batchFiles.some(f => f.status === "done")}
                                        variant="outline"
                                        className="border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10"
                                    >
                                        <FileDown className="mr-2 h-4 w-4" />
                                        Exportar XLSX
                                    </Button>
                                </CardFooter>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="glass p-4 border-indigo-500/10">
                                    <h4 className="text-indigo-300 text-xs font-bold uppercase mb-2">Velocidad</h4>
                                    <p className="text-slate-400 text-sm">Análisis secuencial optimizado para evitar saturación del backend.</p>
                                </Card>
                                <Card className="glass p-4 border-emerald-500/10">
                                    <h4 className="text-emerald-300 text-xs font-bold uppercase mb-2">Precisión</h4>
                                    <p className="text-slate-400 text-sm">Cada documento recibe el mismo peritaje de 10 vectores que el modo individual.</p>
                                </Card>
                                <Card className="glass p-4 border-amber-500/10">
                                    <h4 className="text-amber-300 text-xs font-bold uppercase mb-2">Reporte</h4>
                                    <p className="text-slate-400 text-sm">Generación instantánea de Excel con metadatos y desglose técnico.</p>
                                </Card>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {results && !isBatchMode && (
                <div className="hidden print:block bg-white w-full">
                    <PdfReportTemplate
                        features={results.features}
                        overallScore={results.overallAiPercentage}
                        qualitativeAssessment={results.qualitativeAssessment}
                    />
                </div>
            )}
        </>
    )
}
