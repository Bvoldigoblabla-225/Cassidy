// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "metagen",
  description: "Generate images using Meta.AI (4-image grid)",
  author: "Christus",
  version: "1.0.0",
  usage: "{prefix}{name} <prompt>",
  category: "AI-Image",
  permissions: [0],
  waitingTime: 20,
  requirement: "3.0.0",
  otherNames: ["metaimg", "meta"],
  icon: "🤖",
  noWeb: true,
};

import axios from "axios";
import fs from "fs-extra";
import path from "path";
import stream from "stream";
import { promisify } from "util";
import { createCanvas, loadImage } from "canvas";
import { defineEntry } from "@cass/define";

const pipeline = promisify(stream.pipeline);
const CACHE_DIR = path.join(process.cwd(), "cache", "metagen");
const API_ENDPOINT = "https://metakexbyneokex.fly.dev/images/generate";

/* -------------------- HELPERS -------------------- */

async function downloadImage(url: string, filename: string): Promise<string> {
  const filePath = path.join(CACHE_DIR, filename);

  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 120_000,
    });
    await fs.writeFile(filePath, res.data);
    return filePath;
  } catch (err) {
    if (fs.existsSync(filePath)) await fs.unlink(filePath).catch(() => {});
    throw new Error(`Failed to download image: ${err}`);
  }
}

async function createGridImage(imagePaths: string[], outputPath: string): Promise<void> {
  const images = await Promise.all(imagePaths.map(p => loadImage(p)));
  const imgWidth = images[0].width;
  const imgHeight = images[0].height;
  const padding = 10;
  const numberSize = 40;

  const canvasWidth = (imgWidth * 2) + padding * 3;
  const canvasHeight = (imgHeight * 2) + padding * 3;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const positions = [
    { x: padding, y: padding },
    { x: imgWidth + padding * 2, y: padding },
    { x: padding, y: imgHeight + padding * 2 },
    { x: imgWidth + padding * 2, y: imgHeight + padding * 2 }
  ];

  for (let i = 0; i < images.length && i < 4; i++) {
    const { x, y } = positions[i];
    ctx.drawImage(images[i], x, y, imgWidth, imgHeight);

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(x + numberSize, y + numberSize, numberSize - 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((i + 1).toString(), x + numberSize, y + numberSize);
  }

  await fs.writeFile(outputPath, canvas.toBuffer('image/png'));
}

/* -------------------- ENTRY -------------------- */

export const entry = defineEntry(async ({ input, output, args }) => {
  const prompt = args.join(" ").trim();
  if (!prompt) return output.reply("❌ Veuillez fournir un prompt.\nExemple : metagen futuristic city");

  await fs.ensureDir(CACHE_DIR);
  await output.reply("⏳ Génération des images Meta.AI en cours...");

  try {
    const { data } = await axios.post(API_ENDPOINT, { prompt }, { headers: { 'Content-Type': 'application/json' }, timeout: 150_000 });
    if (!data.success || !data.images || data.images.length < 4) throw new Error("API did not return 4 images.");

    const imageUrls = data.images.slice(0, 4).map((img: any) => img.url);
    const tempPaths: string[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const imgPath = await downloadImage(imageUrls[i], `meta_${Date.now()}_${i+1}.png`);
      tempPaths.push(imgPath);
    }

    const gridPath = path.join(CACHE_DIR, `meta_grid_${Date.now()}.png`);
    await createGridImage(tempPaths, gridPath);

    const info = await output.reply({
      body: `✨ Meta AI generated 4 images\nRépondez avec 1, 2, 3, 4 pour sélectionner une image ou "all" pour tout recevoir.`,
      attachment: fs.createReadStream(gridPath)
    });

    input.setReply(info.messageID, {
      key: "metagen",
      author: input.senderID,
      imageUrls,
      tempPaths,
      gridPath
    });

  } catch (err: any) {
    console.error("MetaGen Error:", err);
    output.reply(`❌ Échec de la génération : ${err.message}`);
  }
});

/* -------------------- REPLY -------------------- */

export async function reply({ input, output, repObj }: any) {
  const { author, imageUrls, tempPaths, gridPath } = repObj;
  if (input.senderID !== author) return;

  const replyText = input.body.trim().toLowerCase();
  const selectedPaths: string[] = [];
  const cacheDir = CACHE_DIR;

  try {
    output.reaction("⏳", input.messageID);

    if (replyText === "all") {
      for (let i = 0; i < imageUrls.length; i++) {
        const imgPath = path.join(cacheDir, `meta_all_${Date.now()}_${i+1}.png`);
        await downloadImage(imageUrls[i], path.basename(imgPath));
        selectedPaths.push(imgPath);
      }
      await output.reply({ body: "✨ Voici toutes les images :", attachment: selectedPaths.map(p => fs.createReadStream(p)) });
    } else {
      const selection = parseInt(replyText);
      if (isNaN(selection) || selection < 1 || selection > 4) return;

      const imgPath = path.join(cacheDir, `meta_selected_${Date.now()}.png`);
      await downloadImage(imageUrls[selection-1], path.basename(imgPath));
      selectedPaths.push(imgPath);

      await output.reply({ body: "✨ Voici votre image :", attachment: fs.createReadStream(imgPath) });
    }

    output.reaction("✅", input.messageID);

  } catch (err: any) {
    output.reaction("❌", input.messageID);
    output.reply(`❌ Échec de la récupération : ${err.message}`);
  } finally {
    // cleanup
    selectedPaths.concat(tempPaths).concat([gridPath]).forEach(p => { if (p && fs.existsSync(p)) fs.unlinkSync(p); });
    input.delReply(repObj.messageID);
  }
}
