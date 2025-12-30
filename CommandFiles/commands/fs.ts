// CommandFiles/commands/fs.ts

import axios from "axios";
import fs from "fs-extra";
import path from "path";
import moment from "moment-timezone";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";

export const meta: CommandMeta = {
  name: "fs",
  description: "Créer une image avec Imagen AI",
  author: "Kay • TS fixed by Christus",
  version: "1.0.0",
  usage: "{prefix}fs <description> --r <ratio>",
  category: "🎨 Art & Design",
  role: 2,
  waitingTime: 10,
  otherNames: [],
  icon: "🎨",
  noLevelUI: true,
};

export const style: CommandStyle = {
  title: "FS • Imagen AI Generator 🎨",
  titleFont: "bold",
  contentFont: "fancy",
};

export const langs = {
  fr: {
    noPrompt:
      "⚠️ Veuillez fournir une description.\nExemple : {prefix}fs robot cyberpunk --r 9:16",
    processing: "🎨 Génération de votre image...\n⏳ Veuillez patienter...",
    success:
      "✅ Image créée avec succès !{ratioMsg}\n🤖 Powered by Imagen AI",
    error:
      "❌ Impossible de générer l'image pour le moment.\n🔄 Réessayez plus tard.",
    help: `
🎨 𝗙𝗦 - 𝗜𝗠𝗔𝗚𝗘𝗡 𝗔𝗜 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗢𝗥

💡 𝗨𝘁𝗶𝗹𝗶𝘀𝗮𝘁𝗶𝗼𝗻:
   {prefix}fs <description>
   {prefix}fs <description> --r <ratio>

📐 𝗥𝗮𝘁𝗶𝗼𝘀:
   --r 9:16, --r 16:9, --r 1:1

📝 𝗘𝘅𝗲𝗺𝗽𝗹𝗲𝘀:
   {prefix}fs dragon warrior
   {prefix}fs anime girl --r 9:16

🤖 Powered by Imagen AI
`,
  },
};

export const entry = defineEntry(async ({ args, output, langParser }) => {
  const getLang = langParser.createGetLang(langs);
  const promptArgs = args.join(" ").trim();

  if (!promptArgs) return output.reply(getLang("noPrompt"));

  // Help command
  if (promptArgs.toLowerCase() === "help" || promptArgs.toLowerCase() === "--help") {
    return output.reply(getLang("help"));
  }

  try {
    // Parse ratio
    const parts = promptArgs.split(" ");
    let ratio: string | null = null;
    const descriptionParts: string[] = [];

    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === "--r" && i + 1 < parts.length) {
        ratio = parts[i + 1];
        i++;
      } else {
        descriptionParts.push(parts[i]);
      }
    }

    let prompt = descriptionParts.join(" ");

    // Ajouter instructions ratio
    if (ratio) {
      if (ratio === "9:16") prompt += ", vertical portrait orientation, tall format";
      else if (ratio === "16:9") prompt += ", horizontal landscape orientation, wide format";
      else if (ratio === "1:1") prompt += ", square format";
    }

    const apiURL = `https://mj-s6wm.onrender.com/draw?prompt=${encodeURIComponent(prompt)}`;

    const timestamp = moment().tz("Asia/Manila").format("MMMM D, YYYY h:mm A");
    const processingMsg = await output.reply(
      `${UNISpectra.charm} ${getLang("processing")}${ratio ? `\n📐 Ratio: ${ratio}` : ""}\n• 📅 ${timestamp}`
    );

    const response = await axios.get(apiURL);
    const images: string[] = response.data?.images || [];

    if (images.length === 0) {
      await output.unsend(processingMsg.messageID);
      return output.reply("❌ Échec génération\n🚫 Aucune image générée\n🔄 Essayez avec une autre description");
    }

    const imgPath = path.join(__dirname, "cache", `fs_${Date.now()}.png`);
    const imageData = await axios.get(images[0], { responseType: "arraybuffer" });
    await fs.ensureDir(path.dirname(imgPath));
    await fs.writeFile(imgPath, imageData.data);

    await output.unsend(processingMsg.messageID);
    await output.reply({
      body: getLang("success", { ratioMsg: ratio ? ` 📐 Ratio: ${ratio}` : "" }),
      attachment: fs.createReadStream(imgPath),
    });

    // Cleanup
    if (await fs.pathExists(imgPath)) await fs.remove(imgPath);
  } catch (err) {
    console.error("❌ FS Generator error:", err);
    return output.reply(getLang("error"));
  }
});
