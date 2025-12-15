// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "pixarai",
  description: "Generate AI images using PixArai",
  author: "Christus",
  version: "1.0.0",
  usage: "{prefix}{name} <prompt>",
  category: "AI-Image",
  permissions: [0],
  waitingTime: 20,
  requirement: "3.0.0",
  otherNames: ["pixar", "pxai"],
  icon: "🎨",
  noWeb: true,
};

import axios from "axios";
import fs from "fs-extra";
import path from "path";
import stream from "stream";
import { promisify } from "util";
import { defineEntry } from "@cass/define";

const pipeline = promisify(stream.pipeline);
const API_ENDPOINT = "https://arychauhann.onrender.com/api/pixarai";
const CACHE_DIR = path.join(process.cwd(), "cache", "pixarai");

/* -------------------- HELPERS -------------------- */

async function downloadImage(url: string): Promise<string> {
  const filePath = path.join(
    CACHE_DIR,
    `pixarai_${Date.now()}.webp`
  );

  try {
    const res = await axios.get(url, {
      responseType: "stream",
      timeout: 120_000,
    });

    await pipeline(res.data, fs.createWriteStream(filePath));
    return filePath;
  } catch {
    if (fs.existsSync(filePath)) await fs.unlink(filePath);
    throw new Error("Failed to download image");
  }
}

/* -------------------- ENTRY -------------------- */

export const entry = defineEntry(
  async ({ input, output, args }) => {
    const prompt = args.join(" ").trim();

    if (!prompt) {
      return output.reply("❌ Veuillez fournir un prompt.\nExemple : pixarai a cyberpunk cat");
    }

    await fs.ensureDir(CACHE_DIR);

    await output.reply("⏳ Génération de l’image PixArai en cours...");

    try {
      const { data } = await axios.get<any>(
        `${API_ENDPOINT}?prompt=${encodeURIComponent(prompt)}`,
        { timeout: 180_000 }
      );

      if (!data?.status || !data?.result?.url) {
        throw new Error("API invalide ou image non générée");
      }

      const imageUrl: string = data.result.url;
      const imageID: string = data.result.id || "N/A";

      const imagePath = await downloadImage(imageUrl);

      await output.reply({
        body:
          "🎨 **PixArai Image Generated**\n" +
          `📝 Prompt : ${prompt}\n` +
          `🆔 ID : ${imageID}`,
        attachment: fs.createReadStream(imagePath),
      });

      // cleanup
      if (fs.existsSync(imagePath)) {
        await fs.unlink(imagePath).catch(() => {});
      }
    } catch (err: any) {
      console.error("PixArai Error:", err);
      output.reply(`❌ Échec de la génération : ${err.message}`);
    }
  }
);
