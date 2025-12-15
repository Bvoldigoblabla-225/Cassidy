import axios, { AxiosResponse } from "axios";
import { StrictOutputForm } from "output-cassidy";

const API_URL = "https://haji-mix-api.gleeze.com/api/groq";

const cmd = easyCMD({
  name: "groq",
  meta: {
    otherNames: ["groqai", "llama33", "groq-llama"],
    author: "Christus dev AI",
    description: "Groq AI – LLaMA 3.3 70B powered assistant",
    icon: "⚡",
    version: "1.0.0",
    noPrefix: "both",
  },
  title: {
    content: "Groq AI ⚡",
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

interface GroqResponse {
  user_ask: string;
  model_used: string;
  answer: string;
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
      "❓ Please provide a prompt.\n\nExample: groq Hello!"
    );
  }

  try {
    const params = {
      ask: prompt,
      model: "llama-3.3-70b-versatile",
      uid: input.sid,
      roleplay: "",
      stream: false,
    };

    const res: AxiosResponse<GroqResponse> = await axios.get(API_URL, {
      params,
      timeout: 25_000,
    });

    const answerText =
      res.data?.answer || "No response received from Groq AI.";

    const form: StrictOutputForm = {
      body:
        `⚡ **Groq AI – LLaMA 3.3 70B**\n\n` +
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
    console.error("Groq API Error:", err?.message || err);
    await output.reaction("❌");
    cancelCooldown();
    return output.reply(
      `❌ Failed to connect to Groq AI.\n\nMessage: ${
        err?.message || "Unknown error"
      }`
    );
  }
}

export default cmd;
