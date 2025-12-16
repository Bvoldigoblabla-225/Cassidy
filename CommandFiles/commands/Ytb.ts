import axios from "axios";
import fs from "fs";
import path from "path";
import yts from "yt-search";
import moment from "moment-timezone";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";

const API_CONFIG_URL =
  "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";

interface APIConfig {
  api: string;
}

interface YTVideo {
  title: string;
  url: string;
  seconds: number;
  thumbnail: string;
}

export const meta: CommandMeta = {
  name: "youtube",
  otherNames: ["ytb"],
  author: "Christus dev AI",
  version: "1.0.0",
  description: "Search and download YouTube video/audio",
  category: "Media",
  usage: "{prefix}{name} -v <query|url>\n{prefix}{name} -a <query|url>",
  role: 0,
  waitingTime: 5,
  icon: "📺",
  noLevelUI: true,
};

export const style: CommandStyle = {
  title: "Astral • YouTube Downloader 🌠",
  titleFont: "bold",
  contentFont: "fancy",
};

export const langs = {
  en: {
    usage: "❌ Usage: -v <query|url> | -a <query|url>",
    noQuery: "❌ Provide a search query or YouTube URL.",
    noResults: "❌ No results found.",
    invalidSelect: "❌ Invalid selection. Choose 1–6.",
    apiFail: "❌ Failed to fetch API configuration.",
    downloadFail: "❌ Failed to download media.",
  },
};

async function getAPIBase(): Promise<string> {
  const { data } = await axios.get<APIConfig>(API_CONFIG_URL);
  if (!data?.api) throw new Error("Missing api field");
  return data.api;
}

async function streamFromURL(url: string) {
  const res = await axios({ url, responseType: "stream" });
  return res.data;
}

function buildList(videos: YTVideo[], type: "-v" | "-a") {
  const time = moment().tz("UTC").format("MMMM D, YYYY h:mm A");

  const list = videos
    .map((v, i) => {
      const quality = type === "-v" ? "360p" : "128kbps";
      return ` • ${i + 1}. ${v.title}\n   🎚️ ${quality}`;
    })
    .join("\n\n");

  return `${UNISpectra.charm} Temporal Coordinates
 • 📅 ${time}
${UNISpectra.standardLine}
${UNISpectra.charm} Select a media
${list}
${UNISpectra.standardLine}
${UNISpectra.charm} Reply with a number (1–6)
${UNISpectra.charm} CassidyAstral 🌌`;
}

async function downloadMedia(
  videoUrl: string,
  type: "mp3" | "mp4",
  apiBase: string,
  output: any
) {
  const { data } = await axios.get(
    `${apiBase}/yx?url=${encodeURIComponent(videoUrl)}&type=${type}`
  );

  const downloadUrl = data?.download_url;
  if (!data?.status || !downloadUrl) throw new Error("API error");

  const filePath = path.join(__dirname, `yt_${Date.now()}.${type}`);
  const writer = fs.createWriteStream(filePath);

  const res = await axios({ url: downloadUrl, responseType: "stream" });
  res.data.pipe(writer);

  await new Promise<void>((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  await output.reply({
    attachment: fs.createReadStream(filePath),
  });

  fs.unlinkSync(filePath);
}

export const entry = defineEntry(
  async ({ input, output, args, langParser }) => {
    const t = langParser.createGetLang(langs);
    const mode = args[0] as "-v" | "-a";
    const query = args.slice(1).join(" ");

    if (!["-v", "-a"].includes(mode)) return output.reply(t("usage"));
    if (!query) return output.reply(t("noQuery"));

    let apiBase: string;
    try {
      apiBase = await getAPIBase();
    } catch {
      return output.reply(t("apiFail"));
    }

    // DIRECT URL
    if (query.startsWith("http")) {
      try {
        await downloadMedia(
          query,
          mode === "-v" ? "mp4" : "mp3",
          apiBase,
          output
        );
      } catch {
        output.reply(t("downloadFail"));
      }
      return;
    }

    // SEARCH
    try {
      const res = await yts(query);
      const videos = res.videos.slice(0, 6);

      if (videos.length === 0) return output.reply(t("noResults"));

      const thumbs = await Promise.all(
        videos.map((v) => streamFromURL(v.thumbnail))
      );

      const msg = await output.reply({
        body: buildList(videos as YTVideo[], mode),
        attachment: thumbs,
      });

      input.setReply(msg.messageID, {
        key: "youtube",
        id: input.senderID,
        results: videos,
        type: mode,
        apiBase,
      });
    } catch (e) {
      output.reply(t("noResults"));
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
  repObj: {
    id: string;
    results: YTVideo[];
    type: "-v" | "-a";
    apiBase: string;
  };
}) {
  const t = langParser.createGetLang(langs);
  if (input.senderID !== repObj.id) return;

  const choice = parseInt(input.body);
  if (isNaN(choice) || choice < 1 || choice > repObj.results.length) {
    return output.reply(t("invalidSelect"));
  }

  const selected = repObj.results[choice - 1];
  input.delReply(String(detectID));

  try {
    await downloadMedia(
      selected.url,
      repObj.type === "-v" ? "mp4" : "mp3",
      repObj.apiBase,
      output
    );
  } catch {
    output.reply(t("downloadFail"));
  }
    }
