import axios from "axios";
import fs from "fs";
import path from "path";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";

/* ================= META ================= */

export const meta: CommandMeta = {
  name: "xl",
  aliases: ["sdxl"],
  author: "Christus Dev AI",
  version: "1.0.0",
  description: "Generate AI images using XL (Stable Diffusion XL)",
  category: "AI",
  usage: "{prefix}{name} <prompt>",
  role: 0,
  waitingTime: 5,
  icon: "🖼️",
  noLevelUI: true,
};

/* ================= STYLE ================= */

export const style: CommandStyle = {
  title: "🖼️ Christus • XL AI",
  titleFont: "bold",
  contentFont: "fancy",
};

/* ================= LANGS ================= */

export const langs = {
  en: {
    noPrompt: "❌ | Please provide a prompt.",
    generating: "🖼️ | Generating image, please wait...",
    failed: "❌ | Image generation failed.",
  },
};

/* ================= CONSTANTS ================= */

const API_URL = "https://arychauhann.onrender.com/api/xl";
const CACHE_DIR = path.join(__dirname, "tmp");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/* ================= ENTRY ================= */

export const entry = defineEntry(
  async ({ input, output, args, langParser }) => {
    const t = langParser.createGetLang(langs);

    if (!args.length) return output.reply(t("noPrompt"));

    const prompt = args.join(" ").trim();
    const waitMsg = await output.reply(t("generating"));

    try {
      const { data } = await axios.get(API_URL, {
        params: { prompt },
        timeout: 120000,
      });

      if (!data?.url) throw new Error("No image URL");

      const imgRes = await axios.get(data.url, {
        responseType: "arraybuffer",
      });

      const filePath = path.join(CACHE_DIR, `xl_${Date.now()}.png`);
      fs.writeFileSync(filePath, imgRes.data);

      await output.unsend(waitMsg.messageID);

      await output.reply({
        body:
          `${UNISpectra.standardLine}\n` +
          `🧠 Prompt: ${prompt}\n` +
          `✅ XL image generated successfully\n` +
          `${UNISpectra.standardLine}`,
        attachment: fs.createReadStream(filePath),
      });

      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("XL ERROR:", err);
      await output.unsend(waitMsg.messageID);
      output.reply(t("failed"));
    }
  }
);
