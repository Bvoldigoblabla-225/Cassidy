import axios from "axios";
import fs from "fs";
import path from "path";
import stream from "stream";
import { promisify } from "util";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";

/* ================= META ================= */

export const meta: CommandMeta = {
  name: "4k",
  aliases: ["upscale", "hd", "enhance"],
  author: "Christus dev AI",
  version: "1.0.0",
  description: "Upscale an image to higher resolution (AI 4K enhancement)",
  category: "AI",
  usage: "{prefix}{name} <image_url> ou répondre à une image",
  role: 0,
  waitingTime: 15,
  icon: "🖼️",
  noLevelUI: true,
};

/* ================= STYLE ================= */

export const style: CommandStyle = {
  title: "🖼️ Christus • 4K Upscale",
  titleFont: "bold",
  contentFont: "fancy",
};

/* ================= LANGS ================= */

export const langs = {
  fr: {
    noImage:
      "❌ Fournis une URL d’image **ou** réponds à une image pour l’améliorer.",
    processing: "🖼️ Amélioration de l’image en cours (4K)... ⏳",
    fail: "❌ Impossible d’améliorer l’image. Réessaie plus tard.",
  },
};

/* ================= CONSTANTS ================= */

const API_ENDPOINT = "https://free-goat-api.onrender.com/4k";
const CACHE_DIR = path.join(__dirname, "cache");
const pipeline = promisify(stream.pipeline);

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

/* ================= UTILS ================= */

function extractImageUrl(args: string[], event: any): string | null {
  const fromArgs = args.find(arg => arg.startsWith("http"));
  if (fromArgs) return fromArgs;

  const replyAtt = event.messageReply?.attachments?.find(
    (a: any) => a.type === "photo" || a.type === "image"
  );

  return replyAtt?.url || null;
}

/* ================= ENTRY ================= */

export const entry = defineEntry(async ({ output, args, langParser, event }) => {
  const t = langParser.createGetLang(langs);

  const imageUrl = extractImageUrl(args, event);
  if (!imageUrl) return output.reply(t("noImage"));

  const loadingMsg = await output.reply(t("processing"));
  let filePath: string | null = null;

  try {
    const { data } = await axios.get(API_ENDPOINT, {
      params: { url: imageUrl },
      timeout: 45000,
    });

    if (!data?.image) throw new Error("No image returned by API");

    const enhancedUrl: string = data.image;
    const fileName = `upscale_4k_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.jpg`;

    filePath = path.join(CACHE_DIR, fileName);

    const imgStream = await axios.get(enhancedUrl, {
      responseType: "stream",
      timeout: 60000,
    });

    await pipeline(imgStream.data, fs.createWriteStream(filePath));

    await output.reply({
      body: `${UNISpectra.charm} **Image améliorée en 4K avec succès**`,
      attachment: fs.createReadStream(filePath),
    });

    if (loadingMsg?.messageID) output.unsend(loadingMsg.messageID);
  } catch (err: any) {
    console.error("4K UPSCALE ERROR:", err);

    if (loadingMsg?.messageID) output.unsend(loadingMsg.messageID);

    let msg = t("fail");
    if (err?.response?.status === 400) {
      msg = "❌ Image invalide ou dimensions non supportées.";
    } else if (String(err.message).includes("timeout")) {
      msg = "❌ Temps de réponse dépassé (API trop lente).";
    }

    output.reply(msg);
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});
