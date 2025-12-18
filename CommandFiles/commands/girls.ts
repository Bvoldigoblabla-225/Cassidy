// CommandFiles/commands/girls.ts

import { defineEntry } from "@cass/define";
import fs from "fs-extra";
import path from "path";
import axios from "axios";

export const meta: CommandMeta = {
  name: "girls",
  description: "NSFW: Image de fille sexy",
  author: "Christus dev AI",
  version: "1.0.0",
  usage: "{prefix}{name}",
  category: "NSFW",
  role: 2,
  noPrefix: false,
  waitingTime: 5,
  otherNames: ["girl", "sexygirl"],
  icon: "🔞",
  noLevelUI: true,
};

export const style: CommandStyle = {
  title: "Christus • Sexy Girl 🌌",
  titleFont: "bold",
  contentFont: "fancy",
};

export const langs = {
  en: {
    error: "❌ Impossible de récupérer l'image depuis l'API.",
  },
};

async function fetchGirlImage() {
  const url = "https://delirius-apiofc.vercel.app/nsfw/girls";
  const response = await axios.get(url, { responseType: "arraybuffer" });
  const imgPath = path.join(__dirname, "cache", `girl_${Date.now()}.jpg`);
  await fs.ensureDir(path.dirname(imgPath));
  await fs.writeFile(imgPath, Buffer.from(response.data));
  return imgPath;
}

export const entry = defineEntry(async ({ output, langParser }) => {
  const getLang = langParser.createGetLang(langs);

  try {
    const imgPath = await fetchGirlImage();
    await output.reply({
      body: "🔞 | Voici une fille pour toi 😏",
      attachment: fs.createReadStream(imgPath),
    });
    fs.unlinkSync(imgPath); // Supprime après envoi
  } catch (err: any) {
    console.error(err);
    output.reply(getLang("error"));
  }
});
