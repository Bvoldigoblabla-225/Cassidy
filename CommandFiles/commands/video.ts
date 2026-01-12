// CommandFiles/commands/video.ts

// @ts-check
import axios from "axios";
import fs from "fs";
import path from "path";
import yts from "yt-search";

/* ================= META ================= */

export const meta: CommandMeta = {
 name: "video",
 description: "Search and download a YouTube video",
 version: "1.0.0",
 author: "Christus dev AI",
 category: "Media",
 role: 0,
 noWeb: true
};

/* ================= STYLE ================= */

export const style: CommandStyle = {
 title: "🎥 YouTube Video Downloader",
 titleFont: "bold",
 contentFont: "fancy"
};

/* ================= CACHE ================= */

const CACHE_DIR = path.join(__dirname, "cache");
if (!fs.existsSync(CACHE_DIR)) {
 fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/* ================= STREAM HELPER ================= */

async function streamToFile(url: string, filePath: string) {
 const res = await axios.get(url, { responseType: "stream", timeout: 120000 });
 const writer = fs.createWriteStream(filePath);

 res.data.pipe(writer);

 await new Promise<void>((resolve, reject) => {
 writer.on("finish", () => resolve());
 writer.on("error", reject);
 });
}

/* ================= CORE ================= */

async function downloadVideo(
 query: string,
 output: CommandContext["output"]
) {
 output.react("⏳");

 try {
 let videoUrl: string;

 if (/^https?:\/\//i.test(query)) {
 videoUrl = query;
 } else {
 const search = await yts(query);
 if (!search.videos?.length) throw new Error("No results");
 videoUrl = search.videos[0].url;
 }

 const apiUrl =
 "https://downvid.onrender.com/api/v1/download" +
 `?url=${encodeURIComponent(videoUrl)}&format=mp4`;

 const { data } = await axios.get(apiUrl, { timeout: 60000 });

 if (data.status !== "success" || !data.downloadUrl)
 throw new Error("API error");

 const filePath = path.join(CACHE_DIR, `video_${Date.now()}.mp4`);

 await streamToFile(data.downloadUrl, filePath);

 await output.replyStyled(
 {
 body: "🎥 Here is your video",
 attachment: fs.createReadStream(filePath)
 },
 style
 );

 fs.unlinkSync(filePath);
 output.react("✅");

 } catch (err) {
 console.error(err);
 output.react("❌");
 output.reply("❌ Failed to download video.");
 }
}

/* ================= ENTRY ================= */

export async function entry({ args, output }: CommandContext) {
 if (!args.length) {
 output.reply("❌ Enter video name or YouTube URL.");
 return;
 }

 await downloadVideo(args.join(" "), output);
}
