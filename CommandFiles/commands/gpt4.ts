import axios, { AxiosResponse } from "axios";
import { StrictOutputForm } from "output-cassidy";

const API_URL =
  "https://wildan-suldyir-apis.vercel.app/api/chatgpt4";

const cmd = easyCMD({
  name: "gpt4",
  meta: {
    otherNames: ["chatgpt4"],
    author: "Christus dev AI",
    description: "ChatGPT-4 – AI assistant (Wildan API)",
    icon: "🤖",
    version: "1.0.0",
    noPrefix: "both",
  },
  title: {
    content: "ChatGPT-4 🤖",
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

interface ChatGPT4Response {
  response: string;
}

async function main({
  output,
  args,
  cancelCooldown,
}: CommandContext) {
  const prompt = args.join(" ").trim();
  await output.reaction("⏳"); // début

  if (!prompt) {
    cancelCooldown();
    await output.reaction("❌");
    return output.reply(
      "❓ Please provide a prompt.\n\nExample: chatgpt4 Hello!"
    );
  }

  try {
    const params = {
      prompt,
    };

    const res: AxiosResponse<ChatGPT4Response> = await axios.get(API_URL, {
      params,
      timeout: 25_000,
    });

    const form: StrictOutputForm = {
      body:
        `🤖 **ChatGPT-4**\n\n` +
        `${res.data.response}\n\n` +
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
    console.error("ChatGPT4 API Error:", err?.message || err);
    await output.reaction("❌");
    cancelCooldown();
    return output.reply(
      `❌ Failed to connect to ChatGPT-4.\n\nMessage: ${
        err?.message || "Unknown error"
      }`
    );
  }
}

export default cmd;
