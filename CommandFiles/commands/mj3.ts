import fs from "fs";
import path from "path";
import axios from "axios";
import Jimp from "jimp";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";

/* ================= META ================= */

export const meta: CommandMeta = {
  name: "midjourney3",
  aliases: ["mj3"],
  author: "Nazrul • Converted by Christus Dev AI",
  version: "1.6.9",
  description: "Generate AI images with MidJourney",
  category: "AI",
  usage: "{prefix}{name} <prompt>",
  role: 0,
  waitingTime: 20,
  icon: "🧞",
  noLevelUI: true,
};

/* ================= STYLE ================= */

export const style: CommandStyle = {
  title: "🪽 Christus • MidJourney",
  titleFont: "bold",
  contentFont: "fancy",
};

/* ================= LANGS ================= */

export const langs = {
  en: {
    noPrompt: "❌ | Please provide a prompt.",
    generating: "⏳ Mj Process started.. please wait!",
    failed: "❌ | MidJourney generation failed.",
    invalid: "❌ | Invalid input. Reply with 1–4 or an action (U1, V2, REROLL).",
    processing: "🔄 Processing {action}...",
  },
};

/* ================= CONSTANTS ================= */

const API_BASE = "https://www.noobs-apis.run.place";
const TMP_DIR = path.join(__dirname, "tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

/* ================= UTILS ================= */

async function saveImage(url: string, name: string): Promise<string> {
  const out = path.join(TMP_DIR, name);
  const res = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(out, res.data);
  setTimeout(() => fs.existsSync(out) && fs.unlinkSync(out), 60 * 60 * 1000);
  return out;
}

async function cropImage(src: string, index: string, id: string): Promise<string> {
  const img = await Jimp.read(src);
  const w = img.bitmap.width / 2;
  const h = img.bitmap.height / 2;

  const map: Record<string, [number, number]> = {
    "1": [0, 0],
    "2": [w, 0],
    "3": [0, h],
    "4": [w, h],
  };

  const [x, y] = map[index];
  const out = path.join(TMP_DIR, `mj_crop_${id}_${index}.png`);
  await img.clone().crop(x, y, w, h).writeAsync(out);
  setTimeout(() => fs.existsSync(out) && fs.unlinkSync(out), 60 * 60 * 1000);
  return out;
}

/* ================= ENTRY ================= */

export const entry = defineEntry(
  async ({ input, output, args, langParser }) => {
    const t = langParser.createGetLang(langs);
    if (!args.length) return output.reply(t("noPrompt"));

    const prompt = args.join(" ").trim();
    const wait = await output.reply(t("generating"));

    try {
      const { data } = await axios.get(
        `${API_BASE}/nazrul/midjourneyv`,
        { params: { prompt } }
      );

      if (!data?.imageUrl) throw new Error("No image");

      const gridPath = await saveImage(
        data.imageUrl,
        `mj_grid_${data.id}.png`
      );

      await output.unsend(wait.messageID);

      const sent = await output.reply({
        body:
          `${UNISpectra.standardLine}\n` +
          `🧠 Prompt: ${prompt}\n` +
          `• taskID: ${data.id}\n\n` +
          `Reply with:\n` +
          `1–4 → Select image\n` +
          `U1–U4 / V1–V4 / REROLL\n` +
          `${UNISpectra.standardLine}`,
        attachment: fs.createReadStream(gridPath),
      });

      input.setReply(sent.messageID, {
        key: "midjourney",
        author: input.senderID,
        taskId: data.id,
        actions: data.buttons || [],
        prompt,
      });
    } catch (e) {
      console.error("MJ ERROR:", e);
      await output.unsend(wait.messageID);
      output.reply(t("failed"));
    }
  }
);

/* ================= REPLY ================= */

export async function reply({
  input,
  output,
  repObj,
  langParser,
}: CommandContext & {
  repObj: {
    author: string;
    taskId: string;
    actions: any[];
    prompt: string;
  };
}) {
  const t = langParser.createGetLang(langs);
  if (input.senderID !== repObj.author) return;

  const text = input.body.trim().toUpperCase();

  try {
    // === CROP 1–4 ===
    if (["1", "2", "3", "4"].includes(text)) {
      const imgUrl = input.messageReply?.attachments?.[0]?.url;
      if (!imgUrl) return;

      const src = await saveImage(imgUrl, `mj_src_${repObj.taskId}.png`);
      const crop = await cropImage(src, text, repObj.taskId);

      return output.reply({
        body: `✅ Selected image ${text}`,
        attachment: fs.createReadStream(crop),
      });
    }

    // === ACTIONS ===
    const action = repObj.actions.find((a) =>
      a.label?.toUpperCase().includes(text)
    );

    if (!action && text !== "REROLL") {
      return output.reply(t("invalid"));
    }

    const wait = await output.reply(
      t("processing").replace("{action}", text)
    );

    const { data } = await axios.get(
      `${API_BASE}/nazrul/action`,
      {
        params: {
          taskID: repObj.taskId,
          cID: action?.customId,
        },
      }
    );

    if (!data?.imageUrl) throw new Error("No image");

    const newGrid = await saveImage(
      data.imageUrl,
      `mj_action_${data.id}.png`
    );

    await output.unsend(wait.messageID);

    const sent = await output.reply({
      body:
        `✅ Action completed: ${text}\n` +
        `Reply again with 1–4 or another action.`,
      attachment: fs.createReadStream(newGrid),
    });

    input.setReply(sent.messageID, {
      ...repObj,
      taskId: data.id,
      actions: data.buttons || [],
    });
  } catch (e) {
    console.error("MJ REPLY ERROR:", e);
    output.reply("❌ Action failed.");
  }
    }
