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

      // Corrigir o diretório de saída, caso não exista
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Redimensionar e adicionar a moldura, sem alterar a rotação
      await sharp(uploaded)
        .resize(1080, 1920) // Redimensiona a imagem
        .composite([{ input: framePath }]) // Adiciona a moldura
        .jpeg() // Converte para formato JPEG
        .toFile(outputPath); // Salva a imagem

      // Retorna a URL da imagem processada
      const imageUrl = `/imagens/${path.basename(outputPath)}`;

      res.status(200).json({ phone, url: imageUrl });
    });
  } catch (e) {
    console.error('Erro geral:', e);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
