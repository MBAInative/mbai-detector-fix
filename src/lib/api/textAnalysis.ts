export interface FeatureScore {
    name: string;
    score: number; // 0 to 100
    description: string;
    isAiIndicator: boolean;
}

export interface ParagraphSegment {
    id: string;
    text: string;
    aiProbability: number; // 0 to 100
    metrics: {
        perplexity: number;
        burstiness: number;
    };
}

export interface AnalysisResponse {
    overallAiPercentage: number;
    qualitativeAssessment: string;
    features: FeatureScore[];
    segments: ParagraphSegment[];
}

export const pingBackend = async (): Promise<{ ok: boolean, ready: boolean }> => {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://us-central1-mbai-native-detector-2026.cloudfunctions.net/analyze";
        const response = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "ping" }) });
        if (!response.ok) return { ok: false, ready: false };
        const data = await response.json();
        return { ok: true, ready: !!data.ready };
    } catch (e) {
        return { ok: false, ready: false };
    }
};

export const analyzeDocument = async (text: string): Promise<AnalysisResponse> => {
    if (!text || !text.trim()) {
        throw new Error("El texto está vacío.");
    }

    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://us-central1-mbai-native-detector-2026.cloudfunctions.net/analyze";
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Falló la comunicación con el motor NLP.");
        }

        return data as AnalysisResponse;

    } catch (error: any) {
        console.error("Error en analyzeDocument:", error);
        throw new Error(error.message || "Error al analizar el documento.");
    }
};
