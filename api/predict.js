export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { clinicalNote } = req.body;
    const HF_TOKEN = process.env.HF_TOKEN; 
    const MODEL_ID = "ricardosantoss/CodexAI-Llama-3-8B-CID10";

    // NOVO ENDPOINT DO HUGGING FACE
    const API_URL = `https://router.huggingface.co/hf-inference/models/${MODEL_ID}`;

    const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nVocê é um médico especialista em CID-10. Analise a nota clínica e retorne APENAS um JSON no formato: {"cids": [{"cid": "codigo", "tipo": "principal", "evidencia": ["trecho"]}]}. Não escreva explicações.<|eot_id|><|start_header_id|>user<|end_header_id|>\n\nNota: ${clinicalNote}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;

    const response = await fetch(API_URL, {
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
          wait_for_model: true // Essencial para evitar o erro de modelo carregando
        }
      }),
    });

    const result = await response.json();

    if (result.error) {
        // Se o erro for de carregamento, o wait_for_model: true deve segurar, 
        // mas tratamos aqui por segurança.
        return res.status(503).json({ error: "O modelo está sendo carregado na GPU. Tente novamente em 30 segundos." });
    }

    let generatedText = result[0].generated_text;

    // Limpeza de blocos de código markdown e extração do JSON
    generatedText = generatedText.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error("Texto gerado sem JSON:", generatedText);
      throw new Error("O modelo não gerou um formato compatível.");
    }

    const finalJson = JSON.parse(jsonMatch[0]);
    res.status(200).json(finalJson);

  } catch (error) {
    console.error("Erro na API Predict:", error);
    res.status(500).json({ error: "Erro na comunicação com o Codex.AI: " + error.message });
  }
}
