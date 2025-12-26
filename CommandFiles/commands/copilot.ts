import axios, { AxiosRequestConfig } from "axios";
import { StrictOutputForm } from "output-cassidy";

const cmd = easyCMD({
  name: "copilot",
  meta: {
    otherNames: [ "cp", "cop"],
    author: "Christus",
    description: "Chat with Copilot AI",
    icon: "🧠",
    version: "1.0.0",
    noPrefix: "both",
  },
  category: "AI",
  title: {
    content: "Copilot AI 🤖",
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

interface CopilotResponse {
  operator: string;
  timestamp: string;
  responseTime: string;
  answer: string;
}

async function main({
  output,
  args,
  input,
  cancelCooldown,
}: CommandContext) {
  let message = args.join(" ");
  await output.reaction("🟡");

  // Support reply
  if (!message && input.replier?.body) {
    message = input.replier.body;
  }

  if (!message) {
    cancelCooldown();
    await output.reaction("🔴");
    return output.reply(
      `❓ Please provide a message.\n\nExample:\n${input.prefix}${input.commandName} Hello, how are you?`
    );
  }

  const headers: AxiosRequestConfig["headers"] = {
    Accept: "application/json",
    "User-Agent": "Copilot-AI-Client/1.0",
  };

  try {
    const res = await axios.get<CopilotResponse>(
      "https://christus-api.vercel.app/ai/copilot",
      {
        params: {
          message,
          model: "default",
        },
        headers,
      }
    );

    if (!res.data?.answer) {
      await output.reaction("🔴");
      return output.reply("❌ Invalid response from Copilot AI.");
    }

    const form: StrictOutputForm = {
      body: `🤖 **Copilot AI**\n\n${res.data.answer}\n\n***Reply to continue the conversation.***`,
    };

    await output.reaction("🟢");
    const info = await output.reply(form);

    // Reply loop (conversation continue)
    info.atReply((rep) => {
      rep.output.setStyle(cmd.style);
      main({ ...rep, args: rep.input.words });
    });
  } catch (err) {
    console.error(err);
    await output.reaction("🔴");
    output.reply("⚠️ Copilot AI service is currently unavailable.");
  }
}

export default cmd;
