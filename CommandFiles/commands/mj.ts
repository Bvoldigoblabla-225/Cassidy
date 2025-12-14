// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "midjourney",
  description: "Generate Midjourney images and select one.",
  author: "Christus",
  version: "1.0.0",
  usage: "{prefix}{name} <prompt>",
  category: "AI-Image",
  permissions: [0],
  noPrefix: false,
  waitingTime: 20,
  requirement: "3.0.0",
  otherNames: ["mj"],
  icon: "🖼️",
  noLevelUI: true,
  noWeb: true,
};

import axios from "axios";
import fs from "fs-extra";
import path from "path";
import stream from "stream";
import { promisify } from "util";
import { defineEntry } from "@cass/define";

const pipeline = promisify(stream.pipeline);
const API_ENDPOINT = "https://dev.oculux.xyz/api/mj-proxy-pub";
const CACHE_DIR = path.join(process.cwd(), "cache", "mj");

/* -------------------- HELPERS -------------------- */

async function downloadSingleImage(
  url: string,
  index: number
): Promise<string> {
  const tempFilePath = path.join(
    CACHE_DIR,
    `mj_${Date.now()}_${index}.jpg`
  );

  try {
    const res = await axios.get(url, {
      responseType: "stream",
      timeout: 120_000,
    });

    await pipeline(res.data, fs.createWriteStream(tempFilePath));
    return tempFilePath;
  } catch (err) {
    if (fs.existsSync(tempFilePath)) await fs.unlink(tempFilePath);
    throw new Error("Failed to download image");
  }
}

/* -------------------- ENTRY -------------------- */

export const entry = defineEntry(
  async ({ input, output, args }) => {
    const prompt = args.join(" ").trim();
    if (!prompt) {
      return output.reply("❌ Please provide a prompt to generate an image.");
    }

    await fs.ensureDir(CACHE_DIR);

    await output.reply("⏳ Generating Midjourney images, please wait...");

    try {
      const { data } = await axios.get<any>(
        `${API_ENDPOINT}?prompt=${encodeURIComponent(prompt)}&usepolling=false`,
        { timeout: 300_000 }
      );

      if (
        !data ||
        data.status === "failed" ||
        !Array.isArray(data.results) ||
        data.results.length < 4
      ) {
        throw new Error(data?.message || "API returned invalid data");
      }

      const imageUrls: string[] = data.results.slice(0, 4);
      const attachments: NodeJS.ReadableStream[] = [];
      const tempPaths: string[] = [];

      for (let i = 0; i < imageUrls.length; i++) {
        const filePath = await downloadSingleImage(imageUrls[i], i + 1);
        attachments.push(fs.createReadStream(filePath));
        tempPaths.push(filePath);
      }

      const info = await output.reply({
        body:
          "✨ **Midjourney images generated**\n" +
          "Reply with **U1–U4** or **V1–V4** to select an image.",
        attachment: attachments,
      });

      input.setReply(info.messageID, {
        key: "mj",
        id: input.senderID,
        imageUrls,
        tempPaths,
      });
    } catch (err: any) {
      console.error("MJ Entry Error:", err);
      output.reply(`❌ Image generation failed: ${err.message}`);
    }
  }
);

/* -------------------- REPLY -------------------- */

export async function reply({
  input,
  output,
  repObj,
  detectID,
}: any) {
  const { id, imageUrls, tempPaths } = repObj;

  if (input.senderID !== id || !imageUrls) return;

  const match = input.body.trim().toUpperCase().match(/^(U|V)([1-4])$/);
  if (!match) return;

  const index = Number(match[2]) - 1;
  if (!imageUrls[index]) return;

  input.delReply(String(detectID));

  let finalPath = "";

  try {
    await output.reply("⏳ Downloading selected image...");

    finalPath = await downloadSingleImage(imageUrls[index], index + 1);

    await output.reply({
      body: "✨ Here is your selected image",
      attachment: fs.createReadStream(finalPath),
    });
  } catch (err: any) {
    console.error("MJ Reply Error:", err);
    output.reply("❌ Failed to retrieve selected image.");
  } finally {
    // cleanup
    for (const p of tempPaths || []) {
      if (fs.existsSync(p)) await fs.unlink(p).catch(() => {});
    }
    if (finalPath && fs.existsSync(finalPath)) {
      await fs.unlink(finalPath).catch(() => {});
    }
  }
  }
