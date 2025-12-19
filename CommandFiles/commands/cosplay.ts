import axios from "axios";
import fs from "fs";
import path from "path";
import { defineEntry } from "@cass/define";
import { UNISpectra } from "@cassidy/unispectra";

export const meta: CommandMeta = {
  name: "cosplay",
  aliases: ["cp", "cos"],
  author: "Christus dev AI",
  version: "1.0.0",
  description: "Récupère une vidéo cosplay depuis l'API Rapido",
  category: "Media",
  usage: "{prefix}{name}",
  role: 0,
  waitingTime: 15,
  icon: "🎭",
  noLevelUI: true,
};

export const entry = defineEntry(async ({ output, langParser }) => {
  const t = langParser.createGetLang({
    fr: {
      fetching: "🎭 Récupération de la vidéo cosplay... ⏳",
      fail: "❌ Impossible de récupérer la vidéo. Veuillez réessayer plus tard.",
    },
  });

  try {
    const loadingMsg = await output.reply(t("fetching"));

    const { data } = await axios.get(
      "https://rapido.zetsu.xyz/api/cosplay?apikey=rapi_55197dde42fb4272bfb8f35bd453ba25",
      { timeout: 20000 }
    );

    if (!data?.videoUrl) return output.reply(t("fail"));

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const videoPath = path.join(cacheDir, `cosplay_${Date.now()}.mp4`);

    const videoResp = await axios.get(data.videoUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(videoPath, Buffer.from(videoResp.data));

    await output.reply({
      body: `${UNISpectra.charm} Vidéo Cosplay récupérée !`,
      attachment: fs.createReadStream(videoPath),
    });

    fs.unlinkSync(videoPath);

    if (loadingMsg?.messageID) output.unsend(loadingMsg.messageID);
  } catch (err) {
    console.error(err);
    output.reply(t("fail"));
  }
});
