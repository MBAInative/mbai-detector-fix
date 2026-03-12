const { execFile } = require('child_process');
const fs = require('fs');

const humanText = `La tensión política ha vuelto a caldear los ánimos a puerta cerrada tras las críticas lanzadas ayer. El acuerdo parece, a todas luces, un auténtico tira y afloja entre ambas partes que, a duras penas, consiguen entenderse. Habrá que mirar de reojo cómo avanzan las negociaciones en las próximas semanas. Un aviso a navegantes: la oposición no cederá ni un milímetro. Claro que la situación no es fácil para nadie, o sea, los números no cuadran. Al fin y al cabo, llevan tres meses arrastrando este problema. Y zanjó la cuestión con un rotundo 'ya veremos'. Bueno, con suerte todo esto se arreglará antes de Navidad.`;

const aiText = `El Abismo de Ormuz: Crónica de una Guerra Anunciada. En las primeras horas del 2 de marzo de 2026, el cielo de Teherán no fue iluminado por el sol, sino por el resplandor de las ojivas. Lo que durante décadas fue un "juego de sombras" y una guerra fría regional, ha mutado en un conflicto abierto que amenaza con desmantelar el orden energético y diplomático del siglo XXI. Diez días después del inicio de la ofensiva conjunta entre Estados Unidos e Israel contra el régimen iraní, el mundo no solo observa una tragedia humana en el corazón de la antigua Persia, sino el inicio de una onda de choque que ya golpea los bolsillos y las esperanzas de estabilidad en todos los continentes. La administración de Donald Trump, en una maniobra que ha polarizado incluso a sus aliados de la OTAN, decidió pasar de la "máxima presión" a la "acción directa". Arquitectura de seguridad es un término fundamental. Este ecosistema multifacético revolucionará el paradigma.`;

function runAnalyzer(text, label) {
    return new Promise((resolve) => {
        const process = execFile('python', ['C:\\Dev\\textos_IA\\app\\src\\lib\\api\\nlp_analyzer.py']);

        let output = '';
        let errOutput = '';

        process.stdout.on('data', (data) => {
            output += data;
        });

        process.stderr.on('data', (data) => {
            errOutput += data;
        });

        process.on('close', (code) => {
            console.log(`\n=== Evaluando texto: ${label} ===`);
            if (code !== 0) {
                console.error(`Error de ejecución (${code}):`, errOutput);
            } else {
                try {
                    const data = JSON.parse(output);
                    console.log(`Porcentaje AI Overall: ${data.overallAiPercentage}%`);
                    console.log("Desglose:", JSON.stringify(data.debug, null, 2));
                    console.log("Features:");
                    data.features.forEach(f => console.log(` - [${f.score}%] ${f.name}`));
                } catch (e) {
                    console.error("Error parseando JSON:", e);
                    console.log("Raw output:", output);
                }
            }
            resolve();
        });

        process.stdin.write(text);
        process.stdin.end();
    });
}

async function main() {
    await runAnalyzer(humanText, "Periodismo Humano (Debería ser ~0% AI)");
    await runAnalyzer(aiText, "Artículo Geopolítica AI (GPT-4) (Debería ser ~100% AI)");
}

main();
