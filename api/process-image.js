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
      const outputPath = path.join(process.cwd(), 'public', 'imagens', `${Date.now()}-final.jpg`);

      // Corrigir a orientação da imagem com EXIF e redimensionar
      await sharp(uploaded)
        .rotate() // Corrige a rotação com base nos dados EXIF
        .resize(1080, 1920)
        .composite([{ input: framePath }])
        .jpeg()
        .toFile(outputPath);

      // Retorna a URL da imagem salva na pasta 'public/imagens'
      const imageUrl = `/imagens/${path.basename(outputPath)}`;

      res.status(200).json({ phone, url: imageUrl });
    });
  } catch (e) {
    console.error('Erro geral:', e);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
