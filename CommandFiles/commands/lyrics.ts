// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "lyrics",
  description: "Récupérer les paroles d'une chanson avec illustration",
  author: "Christus dev AI",
  version: "1.2.0",
  usage: "{prefix}{name} <nom de la chanson>",
  category: "Search",
  permissions: [0],
  waitingTime: 5,
  otherNames: ["lyrics-song", "lyric"],
  icon: "🎼",
  noWeb: true,
};

import axios from "axios";
import fs from "fs-extra";
import path from "path";
import { defineEntry } from "@cass/define";

const CACHE_DIR = path.join(process.cwd(), "cache", "lyrics");

async function downloadImage(url: string, filename: string) {
  const filePath = path.join(CACHE_DIR, filename);
  try {
    const { data } = await axios.get(url, { responseType: "arraybuffer", timeout: 120_000 });
    await fs.writeFile(filePath, data);
    return filePath;
  } catch (err) {
    if (fs.existsSync(filePath)) await fs.unlink(filePath).catch(() => {});
    throw new Error("Échec du téléchargement de l'image de la pochette.");
  }
}

export const entry = defineEntry(async ({ args, output }) => {
  const query = args.join(" ").trim();
  if (!query) return output.reply("❌ Veuillez fournir le nom d'une chanson.\nExemple : lyrics apt");

  await fs.ensureDir(CACHE_DIR);
  await output.reply(`⏳ Recherche des paroles pour : **${query}**`);

  try {
    const { data } = await axios.get<any>(
      `https://lyricstx.vercel.app/youtube/lyrics?title=${encodeURIComponent(query)}`,
      { timeout: 120_000 }
    );

    if (!data?.lyrics) throw new Error("Paroles non trouvées pour cette chanson.");

    const { artist_name, track_name, artwork_url, lyrics } = data;
    const imgPath = await downloadImage(artwork_url, `lyrics_${Date.now()}.jpg`);

    await output.reply({
      body: `🎼 **${track_name}**\n👤 Artiste : ${artist_name}\n\n${lyrics}`,
      attachment: fs.createReadStream(imgPath),
    });

    if (fs.existsSync(imgPath)) await fs.unlink(imgPath).catch(() => {});
  } catch (err: any) {
    console.error("Lyrics Command Error:", err);
    output.reply(`❌ Échec de la récupération : ${err.message}`);
  }
});
