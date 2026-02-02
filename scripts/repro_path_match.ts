
// Mocking the data found in step 492 and 498
const dbPath = "C:\\Users\\leona\\Downloads\\DADOS_ANALISE_FALHA\\ACAB\\Análise de Falha - 2023\\RM1\\Agosto\\Falha Hold down Roll\\20220705-RCA-RM1-Falha Roll down Roll.xlsx";
const csvPath = "C:\\Users\\leona\\Downloads\\DADOS_ANALISE_FALHA\\ACAB\\Análise de Falha - 2023\\RM1\\Agosto\\Falha Hold down Roll\\20220705-RCA-RM1-Falha Roll down Roll.xlsx";

const normalize = (s: string) => s.replace(/\\/g, '/').replace(/\/\//g, '/').trim().toLowerCase();

console.log("DB Path (Normalized):", normalize(dbPath));
console.log("CSV Path (Normalized):", normalize(csvPath));
console.log("Match?", normalize(dbPath) === normalize(csvPath));

// Test partial match logic from csvService.ts
const cleanRcaPath = normalize(dbPath);
const cleanPath = normalize(csvPath);

if (cleanRcaPath === cleanPath || cleanPath.endsWith(cleanRcaPath) || cleanRcaPath.endsWith(cleanPath)) {
    console.log("✅ Logic Match Success");
} else {
    console.log("❌ Logic Match Failed");
}

// Test Encoding issues (Análise vs Analise)
const pathWithAccent = "Análise";
const pathWithoutAccent = "Analise";
console.log(`Accent Check: '${normalize(pathWithAccent)}' vs '${normalize(pathWithoutAccent)}' -> ${normalize(pathWithAccent) === normalize(pathWithoutAccent)}`);
