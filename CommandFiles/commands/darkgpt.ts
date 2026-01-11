import axios from "axios";
import fs from "fs-extra";
import path from "path";
import moment from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";

const API_ENDPOINT = "https://monster-api-18ic.onrender.com/dark";
const TMP_DIR = path.join(__dirname, "cache");

/* ================= META ================= */

export const meta: CommandMeta = {
  name: "darkgpt",
  description: "Accédez à l'IA Dark pour des réponses sans filtres",
  author: "Kay • TS fixed by Christus",
  version: "1.0.0",
  usage: "dark <votre message>",
  category: "AI",
  role: 0,
  waitingTime: 5,
  icon: "🌑",
  noLevelUI: true,
  noPrefix: true,
};

export const style: CommandStyle = {
  title: "Dark AI • Unrestricted 🌑",
  titleFont: "bold",
  contentFont: "fancy",
};

/* ================= LANG ================= */

export const langs = {
  fr: {
    noInput: "🌑 Posez votre question à Dark...",
    processing: "🌑 Dark réfléchit à une réponse...",
    error: "❌ Dark est temporairement indisponible.",
  },
  en: {
    noInput: "🌑 Ask Dark a question...",
    processing: "🌑 Dark is thinking of a response...",
    error: "❌ Dark is temporarily unavailable.",
  },
};

/* ================= ENTRY ================= */

export const entry = defineEntry(async ({ args, event, output, langParser }) => {
  const getLang = langParser.createGetLang(langs);
  const userId = event.senderID;
  const input = args.join(" ").trim();

  if (!input) {
    return output.reply(getLang("noInput"));
  }

  const timestamp = moment()
    .tz("Asia/Manila")
    .format("MMMM D, YYYY h:mm A");

  const loading = await output.reply(
    `${UNISpectra.charm} ${getLang("processing")}\n• 📅 ${timestamp}`
  );

  try {
    // L'API attend uid, prompt et un tableau history
    const res = await axios.post(API_ENDPOINT, {
      uid: userId,
      prompt: input,
      history: [], 
    });

    const { reply, model } = res.data;

    // Nettoyage et formatage de la réponse
    let body = reply || "✅ Dark a répondu.";
    
    // On ajoute le modèle en bas pour info si disponible
    if (model) {
      body += `\n\n— 🔋 Modèle: ${model.split('/').pop()}`;
    }

    await output.unsend(loading.messageID);

    await output.reply({
      body: body,
    });

  } catch (err) {
    console.error("Dark AI Error:", err);
    await output.unsend(loading.messageID);
    await output.reply(getLang("error"));
  }
});
