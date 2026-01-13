export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { clinicalNote } = req.body;
    const HF_TOKEN = process.env.HF_TOKEN; 
    const MODEL_ID = "ricardosantoss/CodexAI-Llama-3-8B-CID10";

    // 1. Prompt formatado para o Llama-3 Instruct
    const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nVocê é um médico especialista em CID-10. Responda APENAS com um objeto JSON válido, sem texto explicativo. Formato: {"cids": [{"cid": "codigo", "tipo": "principal", "evidencia": ["trecho"]}]}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\nAnalise o laudo: ${clinicalNote}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL_ID}`,
      {
        headers: { 
          Authorization: `Bearer ${HF_TOKEN}`, 
          "Content-Type": "application/json" 
        },
        method: "POST",
        body: JSON.stringify({
          inputs: prompt,
          parameters: { 
            max_new_tokens: 500, 
            temperature: 0.1,
            return_full_text: false
          },
          options: {
            wait_for_model: true // ISSO evita o erro de carregamento (faz a requisição esperar até 60s)
          }
        }),
      }
    );

    const result = await response.json();

    // Log para você ver no console o que o modelo respondeu
    console.log("Resposta bruta do HF:", result);

    if (result.error) {
      return res.status(500).json({ error: `Hugging Face Error: ${result.error}` });
    }

    let generatedText = result[0].generated_text;

    // 2. Limpeza de Markdown (Caso o modelo coloque ```json ... ```)
    generatedText = generatedText.replace(/```json/g, "").replace(/```/g, "").trim();

    // 3. Tentar extrair o JSON se houver lixo em volta
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("O modelo não gerou um JSON válido.");

    const finalJson = JSON.parse(jsonMatch[0]);
    res.status(200).json(finalJson);

  } catch (error) {
    console.error("Erro na API Predict:", error);
    res.status(500).json({ error: error.message });
  }
}
