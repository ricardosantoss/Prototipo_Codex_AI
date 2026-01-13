export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { clinicalNote } = req.body;
    const HF_TOKEN = process.env.HF_TOKEN; 
    const DEDICATED_ENDPOINT_URL = "https://jlr58ij8i7f7iyle.us-east-1.aws.endpoints.huggingface.cloud";

    // Prompt ainda mais rígido sobre o formato das aspas
    const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nVocê é um médico especialista em CID-10. Analise a nota e retorne APENAS um JSON válido com ASPAS DUPLAS em todas as chaves e valores. Exemplo: {"cids": [{"cid": "A10", "tipo": "principal", "evidencia": ["..."]}]}. Não use aspas simples.<|eot_id|><|start_header_id|>user<|end_header_id|>\n\nNota: ${clinicalNote}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;

    const response = await fetch(DEDICATED_ENDPOINT_URL, {
      headers: { "Authorization": `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 500, temperature: 0.01, return_full_text: false }
      }),
    });

    const result = await response.json();
    let text = Array.isArray(result) ? result[0].generated_text : result.generated_text;

    if (!text) throw new Error("O modelo retornou uma resposta vazia.");

    // --- FUNÇÃO DE LIMPEZA PESADA ---
    // 1. Remove blocos de código markdown
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // 2. Tenta encontrar o conteúdo entre chaves
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Não foi encontrado um bloco JSON na resposta.");
    
    let jsonString = jsonMatch[0];

    // 3. CORREÇÃO AUTOMÁTICA: Troca aspas simples por duplas (comum em modelos menores)
    // Só faz isso se o JSON.parse falhar na primeira tentativa
    try {
        const finalJson = JSON.parse(jsonString);
        return res.status(200).json(finalJson);
    } catch (e) {
        console.warn("JSON padrão falhou, tentando correção de aspas...");
        // Tenta substituir ' por " (heurística simples)
        jsonString = jsonString.replace(/'/g, '"');
        const fixedJson = JSON.parse(jsonString);
        return res.status(200).json(fixedJson);
    }

  } catch (error) {
    console.error("Erro no Parse:", error.message);
    res.status(500).json({ error: "Erro de Formatação: O modelo gerou um JSON inválido. Tente novamente ou ajuste a nota clínica." });
  }
}
