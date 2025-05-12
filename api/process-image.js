import formidable from 'formidable';
import fs from 'fs/promises';
import sharp from 'sharp';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    const form = formidable({ multiples: false });
    
   form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Erro ao fazer parse:', err);
        return res.status(500).json({ error: 'Erro no upload' });
      }

      const phone = Array.isArray(fields.phone) ? fields.phone[0].replace(/\D/g, '') : '';

      const uploaded = files.image?.[0]?.filepath;

      if (!uploaded) {
        return res.status(400).json({ error: 'Imagem não enviada' });
      }

      const framePath = path.join(process.cwd(), 'public', 'frame.png');
      const outputPath = `/tmp/${Date.now()}-final.jpg`;

await sharp(uploaded)
  .rotate() // Garante que a rotação do EXIF será aplicada
  .resize(1080, 1920, {
    fit: 'cover' // ou 'contain' se quiser evitar corte
  })
  .composite([{ input: framePath }])
  .jpeg()
  .toFile(outputPath);


      const base64 = await fs.readFile(outputPath, { encoding: 'base64' });
      const dataUrl = `data:image/jpeg;base64,${base64}`;

      res.status(200).json({ phone, url: dataUrl });
    });
  } catch (e) {
    console.error('Erro geral:', e);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
