import axios, { AxiosResponse } from "axios";
import { StrictOutputForm } from "output-cassidy";

const API_URL = "https://arychauhann.onrender.com/api/lenna";

const cmd = easyCMD({
  name: "lenna",
  meta: {
    otherNames: ["lennaai", "leva"],
    author: "Christus",
    description: "Lenna AI – Smart Assistant by Aryan Chauhan",
    icon: "🚀",
    version: "1.0.0",
    noPrefix: "both",
  },
  title: {
    content: "Lenna AI 🚀",
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

interface LennaResponse {
  status: boolean;
  operator: string;
  result: string;
}

async function main({
  output,
  args,
  cancelCooldown,
}: CommandContext) {
  const prompt = args.join(" ").trim();
  await output.reaction("⏳");

  if (!prompt) {
    cancelCooldown();
    await output.reaction("❌");
    return output.reply(
      "❓ Please provide a prompt.\n\nExample: lenna Hello!"
    );
  }

  try {
    const res: AxiosResponse<LennaResponse> = await axios.get(API_URL, {
      params: { prompt },
      timeout: 20_000,
    });

    const answerText =
      res.data?.result || "No response received from Lenna AI.";

    const form: StrictOutputForm = {
      body:
        `🚀 **Lenna AI**\n\n` +
        `${answerText}\n\n` +
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
    console.error("Lenna API Error:", err?.message || err);
    await output.reaction("❌");
    cancelCooldown();
    return output.reply(
      `❌ Failed to connect to Lenna AI.\n\nMessage: ${
        err?.message || "Unknown error"
      }`
    );
  }
}

export default cmd;
