/*
 * @XaviaCMD
 * @Christus
 * API switched to Aryan Chauhan
 */

import axios from "axios";

const config = {
  name: "gemini",
  version: "2.0.4",
  permissions: [0],
  noPrefix: "both",
  credits: "Christus dev Bot",
  description:
    "Interact with Google Gemini 2.0 Flash Lite using Aryan Chauhan API.",
  category: "AI",
  usages: "[text]",
  cooldown: 3,
};

const style = {
  titleFont: "bold",
  title: "🤖 Google Gemini",
  contentFont: "fancy",
};

async function onCall({ message, args }) {
  const text = args.join(" ");

  if (!text) {
    return message.reply("❌ Please provide a prompt for Gemini.");
  }

  try {
    const api = `https://arychauhann.onrender.com/api/gemini-proxy2?prompt=${encodeURIComponent(
      text
    )}`;

    const res = await axios.get(api);

    if (!res.data || !res.data.status) {
      return message.reply("❌ Gemini API returned an invalid response.");
    }

    message.reply(res.data.result.trim());
  } catch (e: any) {
    message.reply(
      `❌ Error while contacting Gemini API:\n${e.message}`
    );
  }
}

export default {
  config,
  onCall,
  style,
};
