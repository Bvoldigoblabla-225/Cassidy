import axios, { AxiosResponse } from "axios";
import { StrictOutputForm } from "output-cassidy";

const API_URL = "https://redwans-apis.gleeze.com/api/claude-sonnet-4-5";

const cmd = easyCMD({
  name: "claude",
  meta: {
    otherNames: ["sonnet", "claudeai", "claudebot"],
    author: "Christus dev AI",
    description: "Claude Sonnet 4.5 – Conversational AI assistant",
    icon: "🤖",
    version: "1.1.0",
    noPrefix: "both",
  },
  title: {
    content: "Claude Sonnet 4.5 🤖",
    text_font: "bold",
    line_bottom: "default",
  },
  content: {
    content: null,
    text_font: "none",
    line_bottom: "hidden",
  },
  run(ctx) {
    return main(ctx);
  },
});

interface ClaudeResponse {
  status: string;
  reply?: string;
}

async function main({
  output,
  args,
  input,
  cancelCooldown,
}: CommandContext & { uid?: string }) {
  const prompt = args.join(" ").trim();
  await output.reaction("⏳"); // début

  if (!prompt) {
    cancelCooldown();
    await output.reaction("❌");
    return output.reply(
      "❓ Please provide a prompt for Claude Sonnet 4.5.\n\nExample: claude Hello!"
    );
  }

  try {
    const params = {
      uid: input.sid,
      msg: prompt,
    };

    const res: AxiosResponse<ClaudeResponse> = await axios.get(API_URL, {
      params,
      timeout: 25_000,
    });

    if (!res.data || res.data.status !== "success" || !res.data.reply) {
      throw new Error("Invalid API response");
    }

    const form: StrictOutputForm = {
      body:
        `🤖 **Claude Sonnet 4.5**\n\n` +
        `${res.data.reply}\n\n` +
        `***Reply to continue the conversation.***`,
    };

    await output.reaction("✅");
    const info = await output.reply(form);

    // 🔁 Conversation continue
    info.atReply((rep) => {
      rep.output.setStyle(cmd.style);
      main({
        ...rep,
        args: rep.input.words,
      });
    });
  } catch (err: any) {
    console.error("Claude API Error:", err?.message || err);
    await output.reaction("❌");
    cancelCooldown();
    return output.reply(
      `❌ Failed to connect to Claude Sonnet 4.5.\n\nMessage: ${
        err?.message || "Unknown error"
      }`
    );
  }
}

export default cmd;
