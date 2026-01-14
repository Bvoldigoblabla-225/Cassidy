import axios from "axios";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";

/* ================= META ================= */

export const meta: CommandMeta = {
  name: "edit",
  aliases: [],
  author: "Christus",
  version: "1.0.0",
  description: "Generate or edit images using AI",
  category: "AI",
  usage: "{prefix}{name} <prompt> (optionally reply to an image)",
  role: 0,
  waitingTime: 5,
  icon: "🖼️",
  noLevelUI: true,
};

/* ================= STYLE ================= */

export const style: CommandStyle = {
  title: "🖌️ Christus • Image Gen/Edit",
  titleFont: "bold",
  contentFont: "fancy",
};

/* ================= LANGS ================= */

export const langs = {
  fr: {
    noPrompt: "❌ Veuillez fournir un prompt.\nExemple: !edit a cyberpunk city",
    processing: "⏳ Traitement de votre image en cours...",
    successEdit: "🖌 Image modifiée avec succès.",
    successGen: "🖼 Image générée avec succès.",
    fail: "❌ Impossible de traiter l'image. Veuillez réessayer plus tard.",
  },
  en: {
    noPrompt: "❌ Please provide a prompt.\nExample: !edit a cyberpunk city",
    processing: "⏳ Processing your image...",
    successEdit: "🖌 Image edited successfully.",
    successGen: "🖼 Image generated successfully.",
    fail: "❌ Failed to process image. Please try again later.",
  }
};

/* ================= CONSTANTS ================= */

const CONFIG_URL = "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";

/* ================= HELPERS ================= */

async function getRenzApi(): Promise<string> {
  const { data } = await axios.get(CONFIG_URL, { timeout: 10000 });
  if (!data?.renz) throw new Error("Renz API not found");
  return data.renz;
}

/* ================= ENTRY ================= */

export const entry = defineEntry(
  async ({ output, args, langParser, event }) => {
    const t = langParser.createGetLang(langs);
    const prompt = args.join(" ").trim();

    if (!prompt) return output.reply(t("noPrompt"));

    const loadingMsg = await output.reply(t("processing"));

    try {
      const BASE_URL = await getRenzApi();
      const replied = event.messageReply?.attachments?.[0];
      
      // Construction de l'URL API
      let apiURL = `${BASE_URL}/api/gptimage?prompt=${encodeURIComponent(prompt)}`;

      if (replied && replied.type === "photo") {
        apiURL += `&ref=${encodeURIComponent(replied.url)}`;
        if (replied.width && replied.height) {
          apiURL += `&width=${replied.width}&height=${replied.height}`;
        }
      } else {
        apiURL += `&width=512&height=512`;
      }

      // Envoi de la réponse avec le flux d'image
      await output.reply({
        body:
          `${UNISpectra.charm} **${replied ? t("successEdit") : t("successGen")}**\n` +
          `📝 Prompt : ${prompt}`,
        attachment: await global.utils.getStreamFromURL(apiURL),
      });

      // Nettoyage du message de chargement
      if (loadingMsg?.messageID) output.unsend(loadingMsg.messageID);

    } catch (err) {
      console.error("GPTGEN ERROR:", err);
      if (loadingMsg?.messageID) output.unsend(loadingMsg.messageID);
      output.reply(t("fail"));
    }
  }
);
