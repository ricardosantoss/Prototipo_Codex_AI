export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { clinicalNote } = req.body;
    const HF_TOKEN = process.env.HF_TOKEN; 
    const DEDICATED_ENDPOINT_URL = "https://jlr58ij8i7f7iyle.us-east-1.aws.endpoints.huggingface.cloud";

    const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nVocê é um médico especialista em CID-10. Analise a nota clínica e retorne APENAS um JSON no formato: {"cids": [{"cid": "codigo", "tipo": "principal", "evidencia": ["trecho"]}]}. Não escreva explicações.<|eot_id|><|start_header_id|>user<|end_header_id|>\n\nNota: ${clinicalNote}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;

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
          temperature: 0.01,
          return_full_text: false
        }
      }),
    });

    const result = await response.json();
    
    // LOG DE DIAGNÓSTICO: Isso aparecerá nos logs do seu servidor (Vercel)
    console.log("Resposta bruta do Endpoint:", JSON.stringify(result));

    // Tratamento específico para o formato TGI
    let generatedText = "";
    if (Array.isArray(result) && result.length > 0) {
      generatedText = result[0].generated_text;
    } else if (result.generated_text) {
      generatedText = result.generated_text;
    } else if (result.error) {
      throw new Error(`Hugging Face Error: ${result.error}`);
    }

    if (!generatedText) {
      throw new Error("O modelo respondeu, mas o texto gerado está vazio. Verifique os parâmetros.");
    }

    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("O modelo gerou texto, mas não incluiu o JSON esperado.");

    const finalJson = JSON.parse(jsonMatch[0]);
    res.status(200).json(finalJson);

  } catch (error) {
    console.error("Erro detalhado:", error);
    res.status(500).json({ error: "Erro na análise: " + error.message });
  }
}
    console.error("Erro no Codex.AI:", error);
    res.status(500).json({ error: "Erro na análise: " + error.message });
  }
}
