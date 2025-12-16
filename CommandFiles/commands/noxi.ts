// CommandFiles/commands/noxi.ts

import { defineEntry } from "@cass/define";
import fs from "fs-extra";
import path from "path";
import axios from "axios";

const CACHE_DIR = path.join(__dirname, "cache");
fs.ensureDirSync(CACHE_DIR);

export const meta: CommandMeta = {
  name: "noxi",
  description: "🔞 Recherche et téléchargement de vidéos Noxi",
  author: "Christus dev AI",
  version: "1.0.0",
  usage: "{prefix}{name} <mot-clé>",
  category: "NSFW",
  role: 0,
  waitingTime: 5,
  otherNames: ["xnxx", "xnxxsearch"],
  icon: "📺",
  noLevelUI: true,
};

export const style: CommandStyle = {
  title: "Astral • Noxi Search 🔞",
  titleFont: "bold",
  contentFont: "fancy",
};

export const langs = {
  fr: {
    noQuery: "⛩ | Veuillez entrer un mot-clé pour rechercher sur Noxi.",
    noResults: "❌ | Aucun résultat trouvé.",
    error: "❌ | Erreur lors de la recherche.",
    invalidSelection: "❌ | Numéro invalide.",
    invalidPage: "⛔ Page invalide.",
  },
};

async function fetchNoxi(query: string) {
  const res = await axios.get(
    `https://delirius-apiofc.vercel.app/search/xnxxsearch?query=${encodeURIComponent(query)}`
  );
  return res.data.data;
}

async function downloadVideo(url: string) {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  const filePath = path.join(CACHE_DIR, `${Date.now()}.mp4`);
  await fs.writeFile(filePath, Buffer.from(res.data));
  return filePath;
}

function formatViews(views: string | number) {
  if (!views) return "0";
  if (typeof views === "string") views = Number(views.replace(/[^\d]/g, ""));
  if (views >= 1e6) return (views / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (views >= 1e3) return (views / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
  return views.toString();
}

function renderPage(data: any[], query: string, page: number, pageSize: number) {
  const totalPages = Math.ceil(data.length / pageSize);
  const start = (page - 1) * pageSize;
  const pageData = data.slice(start, start + pageSize);

  const list = pageData
    .map((item, i) => {
      const views = formatViews(item.views);
      const author = item.author ? item.author.padEnd(20, " ") : "";
      const duration = item.duration || "";
      const authorDuration = author ? `${author}${duration}` : duration;
      return `🎌 ${start + i + 1}. 『 ${item.title} 』\n` +
             `👁 ${views}   🕒 ${authorDuration}\n` +
             `⚙ Qualités : low, high`;
    })
    .join("\n\n");

  return `📺 𝗥𝗘𝗦𝗨𝗟𝗧𝗦 𝗡𝗢𝗫𝗜 🔞 (Page ${page}/${totalPages})\n` +
         `━━━━━━━━━━━━━━━━━━\n` +
         `🔍 Mot-clé : *${query}*\n\n${list}\n` +
         `━━━━━━━━━━━━━━━━━━\n` +
         `📥 Réponds avec :\n• un numéro (1-${data.length}) + optionnellement "low" ou "high"\n` +
         `• "all" pour tout recevoir\n• "next" ou "prev" pour naviguer.`;
}

export const entry = defineEntry(async ({ input, output, args, langParser }) => {
  const getLang = langParser.createGetLang(langs);
  const query = args.join(" ").trim();
  if (!query) return output.reply(getLang("noQuery"));

  try {
    const data = await fetchNoxi(query);
    if (!data || data.length === 0) return output.reply(getLang("noResults"));

    const pageSize = 9;
    const page = 1;
    const messageInfo = await output.reply(renderPage(data, query, page, pageSize));

    input.setReply(messageInfo.messageID, {
      key: "noxi",
      id: input.senderID,
      data,
      query,
      page,
      pageSize,
    });
  } catch (err: any) {
    console.error(err);
    output.reply(getLang("error"));
  }
});

export async function reply({
  input,
  output,
  repObj,
}: CommandContext & { repObj: { id: string; data: any[]; query: string; page: number; pageSize: number; key: string } }) {
  const { id, data, query, page, pageSize } = repObj;
  if (!data || input.senderID !== id) return;

  const totalPages = Math.ceil(data.length / pageSize);
  let newPage = page;
  const inputText = input.body.trim().toLowerCase();

  if (inputText === "next") newPage++;
  else if (inputText === "prev") newPage--;
  else if (inputText === "all") {
    for (const item of data.slice(0, 9)) {
      try {
        const dl = await axios.get(`https://delirius-apiofc.vercel.app/download/xnxxdl?url=${encodeURIComponent(item.link)}`);
        const video = dl.data.data;
        const filePath = await downloadVideo(video.download.low);
        await output.reply({
          body: `✅ Téléchargement de '${video.title}' terminé\n👁 Vues: ${video.views} | ⏳ Durée: ${video.duration} | ⚙ Qualité: low`,
          attachment: fs.createReadStream(filePath),
        });
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("❌ Erreur sur une vidéo :", err);
      }
    }
    return;
  } else {
    const parts = inputText.split(" ");
    const num = parseInt(parts[0]);
    const quality = parts[1] || "low";

    if (!num || num < 1 || num > data.length) return output.reply(getLang("invalidSelection"));

    try {
      const dl = await axios.get(`https://delirius-apiofc.vercel.app/download/xnxxdl?url=${encodeURIComponent(data[num - 1].link)}`);
      const video = dl.data.data;
      const videoUrl = video.download[quality] || video.download.low;
      const filePath = await downloadVideo(videoUrl);
      await output.reply({
        body: `✅ Téléchargement de '${video.title}' terminé\n👁 Vues: ${video.views} | ⏳ Durée: ${video.duration} | ⚙ Qualité: ${quality}`,
        attachment: fs.createReadStream(filePath),
      });
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(err);
      output.reply("❌ | Téléchargement impossible.");
    }
    return;
  }

  if (newPage < 1 || newPage > totalPages) return output.reply(getLang("invalidPage"));

  const messageInfo = await output.reply(renderPage(data, query, newPage, pageSize));
  input.setReply(messageInfo.messageID, {
    key: "noxi",
    id,
    data,
    query,
    page: newPage,
    pageSize,
  });
                              }
