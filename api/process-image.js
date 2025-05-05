import formidable from 'formidable';
import fs from 'fs/promises';
import sharp from 'sharp';
import path from 'path';
import { FTPClient } from 'basic-ftp'; // Importa a biblioteca para FTP

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

      // Processamento da imagem
      await sharp(uploaded)
        .rotate()  // Corrige a rotação baseada nas metadados EXIF
        .resize(1080, 1920)
        .composite([{ input: framePath }])
        .jpeg()
        .toFile(outputPath);

      // Lendo a imagem processada e convertendo para base64
      const base64 = await fs.readFile(outputPath, { encoding: 'base64' });
      const dataUrl = `data:image/jpeg;base64,${base64}`;

      // Agora, fazemos o upload da imagem processada para o servidor FTP
      const ftpClient = new FTPClient();

      try {
        // Conectar no servidor FTP
        await ftpClient.access({
          host: process.env.FTP_HOST,       // Usando variáveis de ambiente
          user: process.env.FTP_USER,       // Usando variáveis de ambiente
          password: process.env.FTP_PASSWORD, // Usando variáveis de ambiente
          secure: false, // ou true, se usar FTPS
        });

        // Caminho do arquivo local
        const fileName = path.basename(outputPath);

        // Enviar o arquivo para o servidor FTP (no diretório /imagens)
        await ftpClient.uploadFrom(outputPath, `/imagens/${fileName}`);

        // URL do arquivo no servidor FTP
        const fileUrl = `ftp://${process.env.FTP_HOST}/imagens/${fileName}`;

        // Enviar a URL do arquivo junto com os dados do telefone
        res.status(200).json({ phone, url: dataUrl, fileUrl });

      } catch (ftpError) {
        console.error("Erro ao conectar ou enviar arquivo via FTP", ftpError);
        res.status(500).json({ error: 'Erro ao enviar imagem via FTP' });
      } finally {
        ftpClient.close();
      }
    });
  } catch (e) {
    console.error('Erro geral:', e);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
}