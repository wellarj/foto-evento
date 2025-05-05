import formidable from 'formidable';
import fs from 'fs/promises';
import sharp from 'sharp';
import path from 'path';
import pkg from 'basic-ftp';  // Importa o pacote basic-ftp
const { FTPClient } = pkg;  // Extrai o FTPClient do pacote

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
        .rotate()  // Corrige a rotação baseada nas metadadas EXIF
        .resize(1080, 1920)
        .composite([{ input: framePath }])
        .jpeg()
        .toFile(outputPath);

      // Salvar a imagem no FTP
      const ftpClient = new FTPClient();
      await ftpClient.access({
        host: process.env.FTP_HOST,
        user: process.env.FTP_USER,
        password: process.env.FTP_PASSWORD,
        secure: false,  // Use true se o FTP usar TLS/SSL
      });

      const remoteFilePath = `/imagens/${Date.now()}-final.jpg`;
      await ftpClient.uploadFrom(outputPath, remoteFilePath);

      // Gere o URL da imagem para o WhatsApp
      const imageUrl = `https://${process.env.FTP_HOST}/imagens/${Date.now()}-final.jpg`;

      res.status(200).json({ phone, url: imageUrl });
    });
  } catch (e) {
    console.error('Erro geral:', e);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
