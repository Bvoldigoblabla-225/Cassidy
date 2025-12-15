import axios, { AxiosResponse } from "axios";
import { StrictOutputForm } from "output-cassidy";

const API_URL = "https://haji-mix-api.gleeze.com/api/xdash";

const cmd = easyCMD({
  name: "xdash",
  meta: {
    otherNames: ["xdashai", "xdashbot", "xdash-ai"],
    author: "Christus dev AI",
    description: "XDash AI – Assistant powered by Gleeze",
    icon: "🤖",
    version: "1.0.0",
    noPrefix: "both",
  },
  title: {
    content: "XDash AI 🤖",
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

interface XDashResponse {
  user_ask: string;
  answer: {
    llm_response: string;
    results: Array<{ name: string; url: string; snippet: string }>;
    related_questions: Array<{ question: string }>;
  };
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
    await output.reaction("❌"); // erreur
    return output.reply(
      "❓ Please provide a prompt for XDash AI.\n\nExample: xdash Hello!"
    );
  }

  try {
    const params = {
      ask: prompt,
      stream: false,
    };

    const res: AxiosResponse<XDashResponse> = await axios.get(API_URL, {
      params,
      timeout: 25_000,
    });

    const answerText = res.data?.answer?.llm_response || "No response from XDash AI.";

    const form: StrictOutputForm = {
      body:
        `🤖 **XDash AI**\n\n` +
        `${answerText}\n\n` +
        `***Reply to continue the conversation.***`,
    };

    await output.reaction("✅"); // succès
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
    console.error("XDash API Error:", err?.message || err);
    await output.reaction("❌"); // erreur
    cancelCooldown();
    return output.reply(
      `❌ Failed to connect to XDash AI.\n\nMessage: ${
        err?.message || "Unknown error"
      }`
    );
  }
}

export default cmd;
