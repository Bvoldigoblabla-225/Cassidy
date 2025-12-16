// CommandFiles/commands/sing.ts

import axios from "axios";
import fs from "fs-extra";
import path from "path";
import ytSearch from "yt-search";
import moment from "moment-timezone";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";

const CACHE_DIR = path.join(__dirname, "cache");

interface YTVideo {
  title: string;
  url: string;
  timestamp: string;
  author: {
    name: string;
  };
  thumbnail: string;
}

export const meta: CommandMeta = {
  name: "sing",
  description: "Search & download songs from YouTube (MP3)",
  author: "Christus dev AI",
  version: "2.0.0",
  usage: "{prefix}{name} <song name>",
  category: "Media",
  role: 0,
  noPrefix: false,
  waitingTime: 5,
  requirement: "3.0.0",
  otherNames: ["music"],
  icon: "🎶",
  noLevelUI: true,
};

export const style: CommandStyle = {
  title: "Astral • Music Search 🎧",
  titleFont: "bold",
  contentFont: "fancy",
};

export const langs = {
  en: {
    noQuery: "❌ Please provide a song name.\nExample: {prefix}sing sahiba",
    noResults: "❌ No results found on YouTube.",
    invalidSelection: "❌ Please reply with a valid number (1–6).",
    apiError: "❌ Failed to fetch download link.",
    downloadError: "❌ Error while downloading the audio.",
  },
};

function formatSongList(query: string, videos: YTVideo[]) {
  const timestamp = moment().tz("UTC").format("MMMM D, YYYY h:mm A");

  const list = videos
    .map(
      (v, i) =>
        ` • ${i + 1}. ${v.title} (${v.timestamp})\n   👤 ${v.author.name}`
    )
    .join("\n\n");

  return `${UNISpectra.charm} Temporal Coordinates
 • 📅 ${timestamp}
${UNISpectra.standardLine}
${UNISpectra.charm} Top Results for: "${query}"
${list}
${UNISpectra.standardLine}
${UNISpectra.charm} Reply with a number (1–6) to download
${UNISpectra.charm} CassidyAstral-Midnight 🌃 ${UNISpectra.charm}
[ Transmission from Astral Command ]`;
}

function formatSongInfo(data: any, video: YTVideo) {
  return `${UNISpectra.charm} Music Download Complete 🎵
 • 🎶 Title: ${data.title}
 • 📦 Size: ${data.fileSize}
 • 🎧 Format: ${data.format}
 • 🔗 YouTube: ${video.url}
${UNISpectra.standardLine}
${UNISpectra.charm} CassidyAstral-Midnight 🌃`;
}

export const entry = defineEntry(
  async ({ input, output, args, langParser }) => {
    const getLang = langParser.createGetLang(langs);

    const query = args.join(" ").trim();
    if (!query) return output.reply(getLang("noQuery"));

    try {
      if (!fs.existsSync(CACHE_DIR)) fs.mkdirpSync(CACHE_DIR);

      const search = await ytSearch(query);
      const videos: YTVideo[] = search.videos.slice(0, 6);

      if (videos.length === 0) {
        return output.reply(getLang("noResults"));
      }

      const attachments = [];

      for (let i = 0; i < videos.length; i++) {
        try {
          const res = await axios.get(videos[i].thumbnail, {
            responseType: "arraybuffer",
          });
          const file = path.join(CACHE_DIR, `thumb_${i}.jpg`);
          fs.writeFileSync(file, Buffer.from(res.data));
          attachments.push(fs.createReadStream(file));
        } catch {}
      }

      const messageInfo = await output.reply({
        body: formatSongList(query, videos),
        attachment: attachments,
      });

      input.setReply(messageInfo.messageID, {
        key: "sing",
        id: input.senderID,
        videos,
      });

      attachments.forEach((a: any) => {
        try {
          fs.unlinkSync(a.path);
        } catch {}
      });
    } catch (err) {
      console.error(err);
      output.reply(getLang("apiError"));
    }
  }
);

export async function reply({
  input,
  output,
  repObj,
  detectID,
  langParser,
}: CommandContext & {
  repObj: { id: string; videos: YTVideo[] };
}) {
  const getLang = langParser.createGetLang(langs);
  const { id, videos } = repObj;

  if (input.senderID !== id) return;

  const choice = parseInt(input.body);
  if (isNaN(choice) || choice < 1 || choice > videos.length) {
    return output.reply(getLang("invalidSelection"));
  }

  const video = videos[choice - 1];

  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirpSync(CACHE_DIR);

    const apiConfig = await axios.get(
      "https://raw.githubusercontent.com/arychauhann/APIs/refs/heads/main/api.json"
    );

    const baseApi = apiConfig.data?.ary;
    if (!baseApi) throw new Error("ARY API not found");

    const apiUrl = `${baseApi}/api/ytmp3?url=${encodeURIComponent(
      video.url
    )}&format=mp3`;

    const res = await axios.get(apiUrl, { timeout: 20000 });
    const data = res.data;

    if (!data?.success || !data?.directLink) {
      return output.reply(getLang("apiError"));
    }

    const filename = `${data.videoId || Date.now()}.mp3`;
    const filepath = path.join(CACHE_DIR, filename);

    const dl = await axios.get(data.directLink, {
      responseType: "stream",
      timeout: 0,
    });

    const writer = fs.createWriteStream(filepath);
    dl.data.pipe(writer);

    writer.on("finish", async () => {
      input.delReply(String(detectID));

      await output.reply({
        body: formatSongInfo(data, video),
        attachment: fs.createReadStream(filepath),
      });

      try {
        fs.unlinkSync(filepath);
      } catch {}
    });

    writer.on("error", () => {
      output.reply(getLang("downloadError"));
    });
  } catch (err) {
    console.error(err);
    output.reply(getLang("downloadError"));
  }
}
