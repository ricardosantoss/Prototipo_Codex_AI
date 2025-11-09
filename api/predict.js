import OpenAI from 'openai';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    if (!process.env.OPENAI_API_KEY) {
        throw new Error("A chave de API da OpenAI não foi configurada no servidor.");
    }
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { clinicalNote } = req.body;

    if (!clinicalNote || clinicalNote.trim() === '') {
      return res.status(400).json({ error: 'Nota clínica não pode ser vazia' });
    }

    // PROMPT ATUALIZADO PARA INCLUIR EVIDÊNCIAS E REMOVER CONFIANÇA
    const systemPrompt = `Você é um médico especializado na determinação de códigos CID-10 (Classificação Internacional de Doenças) que atua em um hospital de saúde materna e neonatal. Ao receber uma nota clínica, identifique exclusivamente os códigos CID-10 mais associados àquela nota. Utilize apenas diretrizes médicas reconhecidas (OMS, CDC, FDA, NICE).
Leia atentamente a nota clínica abaixo e extraia:
- 1 CID “principal” (motivo principal de internação/alta);
- 1 CID “secundário” (complicações ou comorbidades relevantes);
- Vários CIDs "terciarios” (demais condições associadas).

Para cada CID identificado, você DEVE também fornecer o trecho EXATO da nota clínica que serve como evidência para aquela predição. Se houver múltiplas evidências para um CID, liste todas. As evidências devem ser frases ou trechos literais da nota clínica.

Sua resposta deve ser UM JSON VÁLIDO no formato de exemplo:
{
  "cids": [
    { "cid": "O80", "tipo": "principal", "evidencia": ["parto único espontâneo"] },
    { "cid": "O99.8", "tipo": "secundário", "evidencia": ["diabetes gestacional", "hipertensão pré-existente"] }
  ]
}
Nada além desse JSON — sem comentários ou campos extras.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-2025-08-07",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: clinicalNote }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.status(200).json(result);

  } catch (error) {
    console.error("[ERRO NA API PREDICT]:", error);
    
    res.status(500).json({
        error: 'Falha ao processar a requisição no servidor.',
        details: error.message
    });
  }
}

