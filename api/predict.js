export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { clinicalNote } = req.body;
    const HF_TOKEN = process.env.HF_TOKEN; 
    
    // URL do seu Endpoint Dedicado que você acabou de criar
    const DEDICATED_ENDPOINT_URL = "https://jlr58ij8i7f7iyle.us-east-1.aws.endpoints.huggingface.cloud";

    // Prompt formatado para o Llama-3-8B-Instruct
    const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nVocê é um médico especialista em CID-10. Analise a nota clínica e retorne APENAS um JSON no formato: {"cids": [{"cid": "codigo", "tipo": "principal", "evidencia": ["trecho"]}]}. Não escreva explicações nem comentários.<|eot_id|><|start_header_id|>user<|end_header_id|>\n\nNota: ${clinicalNote}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;

    const response = await fetch(DEDICATED_ENDPOINT_URL, {
      headers: { 
        "Authorization": `Bearer ${HF_TOKEN}`, 
        "Content-Type": "application/json" 
      },
      method: "POST",
      body: JSON.stringify({
        inputs: prompt,
        parameters: { 
          max_new_tokens: 500, 
          temperature: 0.01, // Baixíssima temperatura para manter o rigor técnico
          top_p: 0.95,
          return_full_text: false
        }
      }),
    });

    const result = await response.json();

    // Em Endpoints Dedicados, o resultado costuma vir como um array: [{generated_text: "..."}]
    let generatedText = Array.isArray(result) ? result[0].generated_text : result.generated_text;

    if (!generatedText) {
      console.error("Erro na resposta do modelo:", result);
      throw new Error("O modelo não retornou dados. Verifique se o Endpoint está 'Running'.");
    }

    // Limpeza de possíveis blocos de código Markdown
    generatedText = generatedText.replace(/```json/g, "").replace(/```/g, "").trim();

    // Extração segura do JSON
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Falha ao extrair JSON da resposta médica.");

    const finalJson = JSON.parse(jsonMatch[0]);
    
    // Retorna para o seu Frontend (script.js)
    res.status(200).json(finalJson);

  } catch (error) {
    console.error("Erro no Codex.AI:", error);
    res.status(500).json({ error: "Erro na análise: " + error.message });
  }
}
