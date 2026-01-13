// Substitua o import da OpenAI por um fetch simples para o Hugging Face
export default async function handler(req, res) {
  try {
    const { clinicalNote } = req.body;

    // Seu token do Hugging Face (coloque no .env)
    const HF_TOKEN = process.env.HF_TOKEN; 
    const MODEL_ID = "ricardosantoss/CodexAI-Llama-3-8B-CID10";

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL_ID}`,
      {
        headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({
          inputs: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nVocê é um médico especialista... (seu prompt aqui)<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${clinicalNote}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`,
          parameters: { max_new_tokens: 500, temperature: 0.1, return_full_text: false }
        }),
      }
    );

    const result = await response.json();
    
    // Aqui você vai precisar de um pequeno ajuste de Regex para extrair o JSON 
    // que o Llama-3 vai gerar, já que ele é um modelo de texto puro.
    const jsonString = result[0].generated_text;
    const cleanJson = JSON.parse(jsonString.substring(jsonString.indexOf('{'), jsonString.lastIndexOf('}') + 1));

    res.status(200).json(cleanJson);
  } catch (error) {
    // tratamento de erro...
  }
}

