import fs from "fs";
import path from "path";
import axios from "axios";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";

/* ================= META ================= */

export const meta: CommandMeta = {
  name: "flux1nm",
  aliases: ["f1nm"],
  author: "Christus Dev AI",
  version: "1.0.0",
  description: "Generate ultra-realistic AI images using Flux 1nm engine",
  category: "AI",
  usage: "{prefix}{name} <prompt>",
  role: 0,
  waitingTime: 20,
  icon: "⚡",
  noLevelUI: true,
};

/* ================= STYLE ================= */

export const style: CommandStyle = {
  title: "⚡ Christus • Flux 1nm",
  titleFont: "bold",
  contentFont: "fancy",
};

/* ================= LANGS ================= */

export const langs = {
  en: {
    noPrompt: "❌ | Please provide a prompt.",
    generating: "⚡ Flux 1nm is generating your images...",
    failed: "❌ | Image generation failed.",
    invalid: "❌ | Invalid input. Reply with U1, U2, U3, or U4.",
  },
};

/* ================= CONSTANTS ================= */

const GEN_API = "http://65.109.80.126:20511/api/flux1nm";
const CACHE_DIR = path.join(__dirname, "cache");

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

/* ================= ENTRY ================= */

export const entry = defineEntry(
  async ({ input, output, args, langParser }) => {
    const t = langParser.createGetLang(langs);
    if (!args.length) return output.reply(t("noPrompt"));

    const prompt = args.join(" ").trim();
    const waitMsg = await output.reply(t("generating"));

    try {
      const { data } = await axios.get(`${GEN_API}?prompt=${encodeURIComponent(prompt)}`);
      if (!data.images || data.images.length !== 4) {
        await output.unsend(waitMsg.messageID);
        return output.reply(t("failed"));
      }

      const imageLinks: string[] = data.images.map((item: any) => item.image_link);

      // Créer une grille 2x2
      const { createCanvas, loadImage } = await import("canvas");
      const imgs = await Promise.all(imageLinks.map(loadImage));
      const canvas = createCanvas(1024, 1024);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(imgs[0], 0, 0, 512, 512);
      ctx.drawImage(imgs[1], 512, 0, 512, 512);
      ctx.drawImage(imgs[2], 0, 512, 512, 512);
      ctx.drawImage(imgs[3], 512, 512, 512, 512);

      const outputPath = path.join(CACHE_DIR, `flux1nm_${Date.now()}.png`);
      fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));

      await output.unsend(waitMsg.messageID);

      const sent = await output.reply({
        body: `${UNISpectra.standardLine}\n❏ Reply with U1, U2, U3, or U4 to select an image\n${UNISpectra.standardLine}`,
        attachment: fs.createReadStream(outputPath),
      });

      input.setReply(sent.messageID, {
        key: "flux1nm",
        author: input.senderID,
        images: imageLinks,
      });
    } catch (err) {
      console.error(err);
      await output.unsend(waitMsg.messageID);
      output.reply(t("failed"));
    }
  }
);

/* ================= REPLY ================= */

export async function reply({
  input,
  output,
  repObj,
  langParser,
}: CommandContext & { repObj: { author: string; images: string[] } }) {
  const t = langParser.createGetLang(langs);
  if (input.senderID !== repObj.author) return;

  const choice = input.body.trim().toUpperCase();
  const map: Record<string, number> = { U1: 0, U2: 1, U3: 2, U4: 3 };
  if (!(choice in map)) return output.reply(t("invalid"));

  const index = map[choice];
  const url = repObj.images[index];
  const stream = await global.utils.getStreamFromURL(url, `flux1nm_selected_${choice}.png`);

  output.reply({
    body: `✅ Here is your selected image (${choice}) from Flux 1nm.`,
    attachment: stream,
  });
        }
