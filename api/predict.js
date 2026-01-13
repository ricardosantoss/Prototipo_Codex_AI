export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { clinicalNote } = req.body;
    const HF_TOKEN = process.env.HF_TOKEN; 
    const DEDICATED_ENDPOINT_URL = "https://jlr58ij8i7f7iyle.us-east-1.aws.endpoints.huggingface.cloud";

    if (!HF_TOKEN) {
        throw new Error("Variável HF_TOKEN não encontrada no ambiente.");
    }

    const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nVocê é um médico especialista em CID-10. Retorne APENAS um JSON no formato: {"cids": [{"cid": "codigo", "tipo": "principal", "evidencia": ["trecho"]}]}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\nNota: ${clinicalNote}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;

    const response = await fetch(DEDICATED_ENDPOINT_URL, {
      headers: { 
        "Authorization": `Bearer ${HF_TOKEN}`, 
        "Content-Type": "application/json" 
      },
      method: "POST",
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 500, temperature: 0.01, return_full_text: false }
      }),
    });

    const result = await response.json();

    // --- BLOCO DE DIAGNÓSTICO ---
    if (result.error) {
      return res.status(500).json({ error: `Hugging Face diz: ${result.error}` });
    }

    // O TGI pode retornar {generated_text: "..."} ou [{generated_text: "..."}]
    let text = "";
    if (Array.isArray(result) && result.length > 0) {
        text = result[0].generated_text;
    } else if (result.generated_text) {
        text = result.generated_text;
    }

    if (!text) {
        console.log("Resposta inesperada:", result);
        throw new Error("O modelo não devolveu o campo 'generated_text'.");
    }

    // Limpeza de Markdown (removendo ```json e ```)
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Extração do JSON via Regex
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("O modelo respondeu texto, mas não gerou um JSON válido.");
    }

    const finalJson = JSON.parse(jsonMatch[0]);
    return res.status(200).json(finalJson);

  } catch (error) {
    console.error("ERRO CRÍTICO:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
