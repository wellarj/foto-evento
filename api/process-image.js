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
  const form = formidable();
  form.parse(req, async (err, fields, files) => {
    const phone = fields.phone.replace(/\D/g, '');
    const imagePath = files.image[0].filepath;

    const outputFile = `/tmp/${Date.now()}-final.jpg`;
    const framePath = path.join(process.cwd(), 'public', 'frame.png');

    await sharp(imagePath)
      .resize(1080, 1920)
      .composite([{ input: framePath, gravity: 'center' }])
      .jpeg()
      .toFile(outputFile);

    const base64 = await fs.readFile(outputFile, { encoding: 'base64' });
    const imageUrl = `data:image/jpeg;base64,${base64}`; // Você pode usar um CDN/Vercel Blob Storage em produção

    res.status(200).json({ phone, url: imageUrl });
  });
}