import axios from "axios";
import fs from "fs-extra";
import path from "path";
import moment from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";

const API_ENDPOINT = "https://shizuai.vercel.app/chat";
const CLEAR_ENDPOINT = "https://shizuai.vercel.app/chat/clear";

const TMP_DIR = path.join(__dirname, "cache");

export const meta: CommandMeta = {
  name: "ai",
  description: "Assistant IA avancé (texte, image, musique, vidéo, lyrics)",
  author: "Aryan Chauchan • TS fixed by  Christus",
  version: "3.0.0",
  usage: "ai <message | image>",
  category: "AI",
  role: 0,
  waitingTime: 3,
  icon: "🤖",
  noLevelUI: true,
  noPrefix: true, // ✅ Commande utilisable sans préfixe
};

export const style: CommandStyle = {
  title: "Shizu • Advanced AI 🤖",
  titleFont: "bold",
  contentFont: "fancy",
};

export const langs = {
  fr: {
    noInput: "💬 Veuillez fournir un message ou une image.",
    processing: "🤖 Analyse IA en cours...\nVeuillez patienter...",
    resetSuccess: "♻️ Conversation réinitialisée avec succès.",
    resetFail: "❌ Échec de la réinitialisation.",
    error: "❌ Une erreur IA est survenue.",
  },
  en: {
    noInput: "💬 Please provide a message or image.",
    processing: "🤖 AI is thinking...\nPlease wait...",
    resetSuccess: "♻️ Conversation successfully reset.",
    resetFail: "❌ Reset failed.",
    error: "❌ An AI error occurred.",
  },
};

async function download(url: string, ext: string): Promise<string> {
  await fs.ensureDir(TMP_DIR);
  const file = path.join(TMP_DIR, `${uuidv4()}.${ext}`);
  const res = await axios.get(url, { responseType: "arraybuffer" });
  await fs.writeFile(file, res.data);
  return file;
}

export const entry = defineEntry(async ({ args, event, output, langParser }) => {
  const getLang = langParser.createGetLang(langs);
  const userId = event.senderID;
  const input = args.join(" ").trim();

  if (!input && !event.attachments?.length)
    return output.reply(getLang("noInput"));

  if (["clear", "reset"].includes(input.toLowerCase())) {
    try {
      await axios.delete(
        `${CLEAR_ENDPOINT}/${encodeURIComponent(userId)}`
      );
      return output.reply(getLang("resetSuccess"));
    } catch {
      return output.reply(getLang("resetFail"));
    }
  }

  const timestamp = moment()
    .tz("Asia/Manila")
    .format("MMMM D, YYYY h:mm A");

  const loading = await output.reply(
    `${UNISpectra.charm} ${getLang("processing")}\n• 📅 ${timestamp}`
  );

  // Récupération de l'image
  let imageUrl: string | null = null;

  // Image envoyée directement
  const directImage = event.attachments?.find(a => a.type === "photo");
  if (directImage) imageUrl = directImage.url;

  // Image via reply
  const replyImage = event.messageReply?.attachments?.find(
    a => a.type === "photo"
  );
  if (replyImage) imageUrl = replyImage.url;

  const createdFiles: string[] = [];

  try {
    const res = await axios.post(API_ENDPOINT, {
      uid: userId,
      message: input,
      image_url: imageUrl,
    });

    const {
      reply,
      image_url,
      music_data,
      video_data,
      shoti_data,
      lyrics_data,
    } = res.data;

    let body = reply || "✅ AI Response";
    const attachments: any[] = [];

    if (image_url) {
      const file = await download(image_url, "jpg");
      attachments.push(fs.createReadStream(file));
      createdFiles.push(file);
    }

    if (music_data?.downloadUrl) {
      const file = await download(music_data.downloadUrl, "mp3");
      attachments.push(fs.createReadStream(file));
      createdFiles.push(file);
    }

    if (video_data?.downloadUrl) {
      const file = await download(video_data.downloadUrl, "mp4");
      attachments.push(fs.createReadStream(file));
      createdFiles.push(file);
    }

    if (shoti_data?.videoUrl) {
      const file = await download(shoti_data.videoUrl, "mp4");
      attachments.push(fs.createReadStream(file));
      createdFiles.push(file);
    }

    if (lyrics_data?.lyrics) {
      body += `\n\n🎵 ${lyrics_data.track_name}\n${lyrics_data.lyrics.slice(
        0,
        1500
      )}`;
    }

    await output.unsend(loading.messageID);

    await output.reply({
      body,
      attachment: attachments.length ? attachments : undefined,
    });

  } catch (err) {
    console.error("AI Error:", err);
    await output.unsend(loading.messageID);
    await output.reply(getLang("error"));
  } finally {
    // Nettoyage safe
    for (const file of createdFiles) {
      if (await fs.pathExists(file)) {
        await fs.remove(file);
      }
    }
  }
});
