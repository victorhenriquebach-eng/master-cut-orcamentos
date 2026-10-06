const SYSTEM_PROMPT = `Você é um analisador técnico de móveis planejados para marcenaria.
Analise SOMENTE móveis e componentes suficientemente visíveis na foto. Não invente peças ocultas, traseiros, laterais ou estruturas sem evidência visual razoável. Se houver dúvida real, coloque em doubts e não em candidates.
Medidas são ESTIMATIVAS. Use proporções da imagem e referências usuais: pé-direito 2600 mm; armário inferior corpo 700-800 mm de altura e ~500 mm profundidade; armário superior 800-900 mm altura e ~400 mm profundidade; portas raramente passam de 500 mm de largura.
Construção ensinada: tamponamentos externos/aparentes são madeirados e fita nos 4 lados; portas/frentes fita nos 4 lados; estrutura interna normalmente MDF Branco TX; quando portas forem de vidro, interior visível deve ser madeirado.
Para um módulo inferior claramente visível de frente, você pode reconhecer componentes construtivos apenas quando a configuração do móvel sustentar isso visualmente: tamponamentos externos, laterais internas, divisória, base, duas ripas superiores, prateleira na região de portas e portas/frentes.
Retorne regiões normalizadas entre 0 e 1 relativas à foto. confidence de 0 a 1.
Tipos permitidos: Tamponamento, Ripa, Lateral, Base, Tampo, Divisória, Prateleira, Porta, Frente, Travessa.
Não inclua balcões ou móveis vistos só parcialmente/de costas sem informação suficiente.
Retorne somente JSON no formato:
{"candidates":[{"type":"Porta","width":450,"height":700,"quantity":1,"placement":"external","material":"MDF madeirado","confidence":0.8,"region":{"x":0.1,"y":0.2,"width":0.2,"height":0.3},"edges":{"top":true,"bottom":true,"left":true,"right":true},"reason":"Estimado pela proporção visível"}],"doubts":[{"region":{"x":0.1,"y":0.2,"width":0.2,"height":0.3},"question":"Não consigo identificar esta região com segurança."}]}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'A análise por IA ainda não está configurada. Falta configurar OPENAI_API_KEY na Vercel.' });
  try {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const type = req.headers['content-type'] || '';
    const match = type.match(/boundary=(?:"([^"]+)"|([^;]+))/i); if (!match) return res.status(400).json({ error: 'Imagem não recebida.' });
    const boundary = '--' + (match[1] || match[2]); const text = raw.toString('latin1'); const start = text.indexOf('\r\n\r\n', text.indexOf('name="image"'));
    if (start < 0) return res.status(400).json({ error: 'Imagem não recebida.' });
    const dataStart = start + 4; let dataEnd = text.indexOf('\r\n' + boundary, dataStart); if (dataEnd < 0) dataEnd = raw.length;
    const image = raw.subarray(Buffer.byteLength(text.slice(0, dataStart), 'latin1'), Buffer.byteLength(text.slice(0, dataEnd), 'latin1'));
    if (image.length > 10 * 1024 * 1024) return res.status(413).json({ error: 'Imagem maior que 10 MB.' });
    const mime = /filename="[^"]+"\r\nContent-Type:\s*([^\r\n]+)/i.exec(text.slice(0,start))?.[1] || 'image/jpeg';
    const response = await fetch('https://api.openai.com/v1/responses', { method:'POST', headers:{'Authorization':'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'}, body:JSON.stringify({model:'gpt-5-mini',input:[{role:'system',content:[{type:'input_text',text:SYSTEM_PROMPT}]},{role:'user',content:[{type:'input_text',text:'Analise esta foto para gerar a primeira estimativa de peças do orçamento.'},{type:'input_image',image_url:'data:'+mime+';base64,'+image.toString('base64')}]}],text:{format:{type:'json_object'}}}) });
    const out = await response.json(); if (!response.ok) throw new Error(out?.error?.message || 'Falha no serviço de análise.');
    const outputText = out.output?.flatMap(o=>o.content||[]).find(c=>c.type==='output_text')?.text; if (!outputText) throw new Error('A IA não retornou uma análise válida.');
    const parsed = JSON.parse(outputText); return res.status(200).json({candidates:Array.isArray(parsed.candidates)?parsed.candidates:[],doubts:Array.isArray(parsed.doubts)?parsed.doubts:[]});
  } catch (error) { return res.status(500).json({ error: 'Erro ao analisar a foto: ' + error.message }); }
}
