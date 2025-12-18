import moment from "moment-timezone";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";

export const meta: CommandMeta = {
  name: "aiphoto",
  description: "Generate an AI portrait image",
  author: "Christus dev AI",
  version: "1.0.1",
  usage: "{prefix}{name} <prompt>",
  category: "AI",
  role: 0,
  noPrefix: false,
  waitingTime: 10,
  requirement: "3.0.0",
  otherNames: ["aigenerate", "aiimg"],
  icon: "🖼️",
  noLevelUI: true,
};

export const style: CommandStyle = {
  title: "CHRISTUS • AI Photo Generator 🤖",
  titleFont: "bold",
  contentFont: "fancy",
};

export const langs = {
  en: {
    noQuery: "Please provide a prompt for the AI image generator!",
    error: "Error generating AI image: %1",
  },
};

async function fetchAIImage(prompt: string) {
  const slug = "ai-photo-generator";
  const ratio = "4:5";
  const apiUrl = `https://zetbot-page.onrender.com/api/aifreebox?prompt=${encodeURIComponent(
    prompt
  )}&ratio=${ratio}&slug=${slug}`;
  const response = await fetch(apiUrl);
  return await response.json();
}

function formatMessage() {
  const timestamp = moment().tz("Asia/Manila").format("MMMM D, YYYY h:mm A");

  return `${UNISpectra.charm} Temporal Coordinates
 • 📅 ${timestamp}
${UNISpectra.standardLine}
${UNISpectra.charm} AI Image Generated
${UNISpectra.standardLine}
${UNISpectra.charm} ChristusBot-Midnight 🏂 ${UNISpectra.charm}
[ Transmission from Astral Command ]`;
}

export const entry = defineEntry(
  async ({ args, output, langParser }) => {
    const getLang = langParser.createGetLang(langs);
    try {
      const prompt = args.join(" ").trim();
      if (!prompt) return output.reply(getLang("noQuery"));

      const data = await fetchAIImage(prompt);
      if (!data.success || !data.imageUrl) throw new Error("Invalid API response");

      // Envoi de l'image en pièce jointe
      return output.reply({
        body: formatMessage(),
        attachment: await global.utils.getStreamFromURL(data.imageUrl),
      });
    } catch (error: any) {
      return output.reply(getLang("error", error.message));
    }
  }
);
