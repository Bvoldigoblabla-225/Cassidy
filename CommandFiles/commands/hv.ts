// CommandFiles/commands/hentaivid.ts

import moment from "moment-timezone";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";

interface HentaiItem {
  title: string;
  link: string;
  category: string;
  share_count: string;
  views_count: string;
  type: string;
  video_1?: string;
  video_2?: string;
}

export const meta: CommandMeta = {
  name: "hentaivid",
  description: "Send random NSFW videos",
  author: "Christus dev AI",
  version: "1.0.0",
  usage: "{prefix}{name}",
  category: "NSFW",
  role: 2,
  noPrefix: false,
  waitingTime: 5,
  requirement: "3.0.0",
  otherNames: ["hv", "nsfwvid"],
  icon: "🔞",
  noLevelUI: true,
};

export const style: CommandStyle = {
  title: "Christus • NSFW Archive 🌌",
  titleFont: "bold",
  contentFont: "fancy",
};

export const langs = {
  en: {
    error: "Error fetching NSFW media.",
    noMedia: "No media found.",
  },
};

async function fetchHentaiVideos(): Promise<HentaiItem[]> {
  const res = await fetch(
    "https://delirius-apiofc.vercel.app/anime/hentaivid"
  );
  // @ts-ignore
  return await res.json();
}

function formatInfo(item: HentaiItem) {
  const timestamp = moment().tz("Asia/Manila").format("MMMM D, YYYY h:mm A");

  return `${UNISpectra.charm} Temporal Coordinates
 • 📅 ${timestamp}
${UNISpectra.standardLine}
${UNISpectra.charm} NSFW Media Delivered
 • 🎞️ Title: ${item.title}
 • 🏷️ Category: ${item.category}
 • 👁️ Views: ${item.views_count}
 • 🔁 Shares: ${item.share_count}
${UNISpectra.standardLine}
${UNISpectra.charm} Christus-Midnight 🌃 ${UNISpectra.charm}
[ Transmission from Christus Command ]`;
}

export const entry = defineEntry(
  async ({ output, langParser }) => {
    const getLang = langParser.createGetLang(langs);

    try {
      const data = await fetchHentaiVideos();

      if (!Array.isArray(data) || data.length === 0) {
        return output.reply(getLang("noMedia"));
      }

      const pick = data[Math.floor(Math.random() * data.length)];
      const mediaURL = pick.video_1 || pick.video_2;

      if (!mediaURL) {
        return output.reply(getLang("noMedia"));
      }

      await output.reply({
        body: formatInfo(pick),
        attachment: await global.utils.getStreamFromURL(mediaURL),
      });
    } catch (e) {
      return output.reply(getLang("error"));
    }
  }
);
