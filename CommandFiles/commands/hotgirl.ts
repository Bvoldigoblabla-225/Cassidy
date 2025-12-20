// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "hotgirl",
  description: "Télécharge une image sexy NSFW depuis l'API Delirius",
  author: "Aesther typeScript version by Christus",
  version: "1.0.0",
  usage: "{prefix}{name}",
  category: "NSFW",
  permissions: [2],
  waitingTime: 5,
  otherNames: [],
  icon: "🔥",
  noWeb: true,
};

import axios from "axios";
import fs from "fs-extra";
import path from "path";
import { defineEntry } from "@cass/define";

const CACHE_DIR = path.join(process.cwd(), "cache", "nsfw");

export const entry = defineEntry(async ({ message, output }) => {
  await fs.ensureDir(CACHE_DIR);

  const url = "https://delirius-apiofc.vercel.app/nsfw/girls";
  const filePath = path.join(CACHE_DIR, `hotgirl_${Date.now()}.jpg`);

  await message.react("⏳");

  try {
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 30_000 });
    await fs.writeFile(filePath, response.data);

    await message.react("✅");
    await output.reply({
      body: "🔥 | Voici ta dose NSFW du jour !",
      attachment: fs.createReadStream(filePath),
    });

    await fs.unlink(filePath);
  } catch (err) {
    console.error("Hotgirl Command Error:", err);
    await message.react("❌");
    await output.reply("⚠️ | Impossible de récupérer l’image.");
  }
});
