import axios from "axios";
import fs from "fs";
import path from "path";
import { defineEntry } from "@cass/define";

/* ================= META ================= */

export const meta: CommandMeta = {
  name: "dimage",
  aliases: [],
  author: "Hassan • TS fixed by Christus",
  version: "1.0.0",
  description: "Generate and download AI image",
  category: "Image Generation",
  usage: "{prefix}{name} <prompt>",
  role: 2,
  waitingTime: 5,
  icon: "📥",
  noLevelUI: true,
};

/* ================= STYLE ================= */

export const style: CommandStyle = {
  title: "📥 DIMAGE AI Generator",
  titleFont: "bold",
  contentFont: "fancy",
};

/* ================= LANGS ================= */

export const langs = {
  en: {
    noPrompt: "❌ | Please enter a prompt.\nExample: dl A cyberpunk cat in a rainy city",
    generating: "💚 | Generating your image, please wait...",
    generateFail: "❌ | Error generating image. Please try again later.",
    urlFail: "❌ | Failed to retrieve image URL. Please try a different prompt.",
  },
};

/* ================= CONSTANTS ================= */

const API_URL = "https://theone-fast-image-gen.vercel.app";
const CACHE_DIR = path.join(__dirname, "cache");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

/* ================= ENTRY ================= */

export const entry = defineEntry(
  async ({ input, output, args, langParser }) => {
    const t = langParser.createGetLang(langs);

    if (!args.length) return output.reply(t("noPrompt"));

    const prompt = args.join(" ").trim();
    const waitMsg = await output.reply(t("generating"));

    try {
      // Étape 1 : Récupérer l'URL de téléchargement
      const apiRes = await axios.get(API_URL, { params: { prompt } });
      const downloadUrl = apiRes.data?.download_url;

      if (!downloadUrl) {
        await output.unsend(waitMsg.messageID);
        return output.reply(t("urlFail"));
      }

      // Étape 2 : Télécharger l'image
      const imgResponse = await axios.get(downloadUrl, { responseType: "arraybuffer" });
      const filePath = path.join(CACHE_DIR, `dl_image_${Date.now()}.png`);
      fs.writeFileSync(filePath, imgResponse.data);

      await output.unsend(waitMsg.messageID);

      // Étape 3 : Envoyer l'image
      await output.reply({
        body: `✅ | Here's your generated image for: "${prompt}"`,
        attachment: fs.createReadStream(filePath),
      });

      fs.unlinkSync(filePath);
    } catch (err: any) {
      console.error("DL Command Error:", err.message || err);
      await output.unsend(waitMsg.messageID);
      output.reply(t("generateFail"));
    }
  }
);
