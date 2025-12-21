import fs from "fs";
import path from "path";
import axios from "axios";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";

/* ================= META ================= */

export const meta: CommandMeta = {
  name: "midjourney2",
  aliases: ["midj2", "mj2"],
  author: "Christus Dev AI",
  version: "2.5.0",
  description: "Generate MidJourney-style AI images",
  category: "AI",
  usage: "{prefix}{name} <prompt>",
  role: 2,
  waitingTime: 15,
  icon: "🎨",
  noLevelUI: true,
};

/* ================= STYLE ================= */

export const style: CommandStyle = {
  title: "🎨 Christus • MidJourney",
  titleFont: "bold",
  contentFont: "fancy",
};

/* ================= LANGS ================= */

export const langs = {
  en: {
    noPrompt: "❌ | Please provide a prompt.",
    generating: "🎨 Generating image, please wait...",
    failed: "❌ | Image generation failed.",
    processing: "🔄 Processing {action}...",
    invalid: "❌ | Invalid action. Use U1–U4 or V1–V4.",
  },
};

/* ================= CONSTANTS ================= */

const TASK_FILE = path.join(__dirname, "midj_tasks.json");

if (!fs.existsSync(TASK_FILE)) fs.writeFileSync(TASK_FILE, "{}");

async function getBaseURL(): Promise<string> {
  const { data } = await axios.get(
    "https://gitlab.com/Rakib-Adil-69/shizuoka-command-store/-/raw/main/apiUrls.json"
  );
  return data.mj;
}

/* ================= ENTRY ================= */

export const entry = defineEntry(
  async ({ input, output, args, langParser }) => {
    const t = langParser.createGetLang(langs);
    if (!args.length) return output.reply(t("noPrompt"));

    const prompt = args.join(" ").trim();
    const waitMsg = await output.reply(t("generating"));

    try {
      const baseURL = await getBaseURL();

      const { data } = await axios.get(`${baseURL}/imagine`, {
        params: { prompt: encodeURIComponent(prompt) },
      });

      if (!data?.murl) throw new Error("No image");

      const taskId = data.taskId;
      const imageUrl = data.murl;

      const imgStream = await global.utils.getStreamFromURL(imageUrl);

      await output.unsend(waitMsg.messageID);

      const sent = await output.reply({
        body:
          `${UNISpectra.standardLine}\n` +
          `🧠 Prompt: ${prompt}\n` +
          `❏ U1   U2\n❏ U3   U4\n` +
          `❏ V1   V2\n❏ V3   V4\n` +
          `${UNISpectra.standardLine}`,
        attachment: imgStream,
      });

      input.setReply(sent.messageID, {
        key: "midjourney",
        taskId,
        prompt,
        baseURL,
        author: input.senderID,
      });
    } catch (err) {
      console.error("MIDJ ERROR:", err);
      await output.unsend(waitMsg.messageID);
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
    taskId: string;
    prompt: string;
    baseURL: string;
    author: string;
  };
}) {
  const t = langParser.createGetLang(langs);
  if (input.senderID !== repObj.author) return;

  const action = input.body.toLowerCase();
  const valid = ["u1", "u2", "u3", "u4", "v1", "v2", "v3", "v4"];
  if (!valid.includes(action)) return output.reply(t("invalid"));

  const isVar = action.startsWith("v");
  const cid = action.slice(1);
  const mode = isVar ? "var" : "up";

  const wait = await output.reply(
    t("processing").replace("{action}", action.toUpperCase())
  );

  try {
    const { data } = await axios.get(
      `${repObj.baseURL}/${mode}?tid=${repObj.taskId}&cid=${cid}`
    );

    if (!data?.url) throw new Error("No result");

    const img = await global.utils.getStreamFromURL(data.url);
    await output.unsend(wait.messageID);

    const sent = await output.reply({
      body: `✅ ${action.toUpperCase()} completed.\nReply again with U1–U4 or V1–V4.`,
      attachment: img,
    });

    input.setReply(sent.messageID, {
      ...repObj,
      taskId: data.tid || repObj.taskId,
    });
  } catch (err) {
    console.error("MIDJ ACTION ERROR:", err);
    await output.unsend(wait.messageID);
    output.reply("❌ Processing failed.");
  }
    }
