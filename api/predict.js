// api/predict.js
import OpenAI from 'openai';

// Inicializa o cliente da OpenAI com a chave de API
// que estará nas "Environment Variables" da Vercel
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// A função principal que a Vercel executará
export default async function handler(req, res) {
  // 1. Validação da Requisição
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { clinicalNote } = req.body;

  if (!clinicalNote || clinicalNote.trim() === '') {
    return res.status(400).json({ error: 'Nota clínica não pode ser vazia' });
  }

  // 2. Construção do Prompt (usando a estrutura do seu artigo)
  const systemPrompt = `Você é um médico especializado na determinação de códigos CID-10 (Classificação Internacional de Doenças) que atua em um hospital de saúde materna e neonatal. Ao receber uma nota clínica, identifique exclusivamente os códigos CID-10 mais associados àquela nota, sem qualquer informação ou explicação adicional. Utilize apenas diretrizes médicas reconhecidas (OMS, CDC, FDA, NICE).
Leia atentamente a nota clínica abaixo e extraia:
- 1 CID “principal” (motivo principal de internação/alta);
- 1 CID “secundário” (complicações ou comorbidades relevantes);
- Vários CIDs "terciarios” (demais condições associadas).
Sua resposta deve ser UM JSON VÁLIDO no formato de exemplo:
{ "cids": [ { "cid": "O80", "tipo": "principal" }, { "cid": "O99.8", "tipo": "secundário" } ] }
Nada além desse JSON — sem comentários ou campos extras.`;

  try {
    // 3. Chamada para a API da OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Ou "gpt-4o" para máxima qualidade
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: clinicalNote }
      ],
      response_format: { type: "json_object" }, // Força a saída em JSON
      temperature: 0.1, // Baixa temperatura para resultados mais consistentes
    });

    // 4. Envio da Resposta para o Frontend
    const result = JSON.parse(completion.choices[0].message.content);
    res.status(200).json(result);

  } catch (error) {
    console.error("Erro na chamada da API OpenAI:", error);
    res.status(500).json({ error: 'Falha ao comunicar com a IA. Tente novamente.' });
  }
}
