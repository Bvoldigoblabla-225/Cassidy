// CommandFiles/commands/goatstor.ts

import axios from "axios";
import fs from "fs";
import path from "path";
import { defineEntry } from "@cass/define";

const GOATSTOR = "https://goatstore.vercel.app";

/* ================= META ================= */

export const meta: CommandMeta = {
  name: "goatstor",
  description: "🐐 GoatStor – Marketplace de commandes",
  author: "Christus dev AI",
  version: "1.0.0",
  usage: "{prefix}goatstor <show|page|search|trending|status|like|upload>",
  category: "Utility",
  role: 0,
  waitingTime: 0,
  otherNames: ["gs", "market"],
  icon: "🐐",
  noLevelUI: true,
};

/* ================= UI ================= */

const box = (content: string) =>
  `╭───『 🐐 𝗚𝗼𝗮𝘁𝗦𝘁𝗼𝗿 』───╮\n${content}\n╰──────────────╯`;

const cassidyBox = (payload: any) =>
  `🤖 ❲ 𝗖𝗮𝘀𝘀𝗶𝗱𝘆𝗕𝗼𝘁 • GoatStor ❳ 🤖
━━━━━━━━━━━━━━━
📦 Nom: ${payload.itemName}
🆔 ID: ${payload.itemID}
⚙️ Type: ${payload.type || "Unknown"}
📝 Description: ${payload.description}
👨‍💻 Auteur: ${payload.authorName}
👀 Vues: ${payload.views}
💝 Likes: ${payload.likes}
🔗 Lien: ${payload.link}
━━━━━━━━━━━━━━━`;

const handleError = (err: any, action: string) => {
  if (err.response?.status === 404) return box("❌ Ressource introuvable.");
  if (err.response?.status === 500) return box("⚠️ Erreur serveur.");
  if (["ECONNREFUSED", "ENOTFOUND"].includes(err.code))
    return box(`🔌 Impossible de joindre GoatStor\n${GOATSTOR}`);
  return box(
    `❌ Impossible de ${action}\nStatus: ${err.response?.status || "Inconnu"}\nMessage: ${
      err.response?.data?.error || err.message
    }`
  );
};

/* ================= ENTRY ================= */

export const entry = defineEntry(async ({ args, output }) => {
  try {
    if (!args[0]) {
      return output.reply(
        box(
          `📋 Commandes disponibles:\n
📦 {prefix}goatstor show <ID>
📄 {prefix}goatstor page <number>
🔍 {prefix}goatstor search <query>
🔥 {prefix}goatstor trending
📊 {prefix}goatstor status
💝 {prefix}goatstor like <ID>
⬆️ {prefix}goatstor upload <filename>

💡 Exemple : {prefix}goatstor show 1`
        )
      );
    }

    const sub = args[0].toLowerCase();

    /* ========== SHOW ========== */
    if (sub === "show") {
      const id = Number(args[1]);
      if (isNaN(id)) return output.reply(box("⚠️ ID invalide."));
      try {
        const { data } = await axios.get(`${GOATSTOR}/api/item/${id}`);
        return output.reply(
          cassidyBox({
            itemName: data.itemName,
            itemID: data.itemID,
            type: data.type,
            description: data.description,
            authorName: data.authorName,
            views: data.views,
            likes: data.likes,
            link: `${GOATSTOR}/raw/${data.rawID}`,
          })
        );
      } catch (err) {
        return output.reply(handleError(err, "récupérer la commande"));
      }
    }

    /* ========== PAGE ========== */
    if (sub === "page") {
      const page = Number(args[1]) || 1;
      if (page <= 0) return output.reply(box("⚠️ Page invalide."));
      try {
        const res = await axios.get(`${GOATSTOR}/api/items?page=${page}&limit=5`);
        const { items, total } = res.data;
        if (!items.length) return output.reply(box("📭 Aucun résultat."));
        const totalPages = Math.ceil(total / 5);

        const list = items
          .map(
            (x: any, i: number) =>
              `${(page - 1) * 5 + i + 1}. 📦 ${x.itemName} (ID: ${
                x.itemID
              })\n👀 ${x.views} | 💝 ${x.likes} | 👨‍💻 ${x.authorName}`
          )
          .join("\n\n");

        return output.reply(
          box(`📄 Page ${page}/${totalPages}\n\n${list}`)
        );
      } catch (err) {
        return output.reply(handleError(err, "parcourir les commandes"));
      }
    }

    /* ========== SEARCH ========== */
    if (sub === "search") {
      const query = args.slice(1).join(" ");
      if (!query) return output.reply(box("⚠️ Recherche requise."));
      try {
        const res = await axios.get(
          `${GOATSTOR}/api/items?search=${encodeURIComponent(query)}`
        );
        const items = res.data.items;
        if (!items.length)
          return output.reply(box(`❌ Aucun résultat pour "${query}"`));

        const list = items
          .slice(0, 5)
          .map(
            (x: any, i: number) =>
              `${i + 1}. 📦 ${x.itemName} (ID: ${x.itemID})\n👀 ${
                x.views
              } | 💝 ${x.likes} | 👨‍💻 ${x.authorName}`
          )
          .join("\n\n");

        return output.reply(box(`🔍 "${query}"\n\n${list}`));
      } catch (err) {
        return output.reply(handleError(err, "rechercher"));
      }
    }

    /* ========== TRENDING ========== */
    if (sub === "trending") {
      try {
        const { data } = await axios.get(`${GOATSTOR}/api/trending`);
        const list = data
          .slice(0, 5)
          .map(
            (x: any, i: number) =>
              `${i + 1}. 🔥 ${x.itemName}\n💝 ${x.likes} | 👀 ${x.views}`
          )
          .join("\n\n");
        return output.reply(box(list));
      } catch (err) {
        return output.reply(handleError(err, "récupérer les tendances"));
      }
    }

    /* ========== STATUS ========== */
    if (sub === "status") {
      try {
        const { data } = await axios.get(`${GOATSTOR}/api/stats`);
        const up = data.hosting?.uptime || {};
        return output.reply(
          box(
            `📊 Statistiques GoatStor

📦 Commandes: ${data.totalCommands}
💝 Likes: ${data.totalLikes}
👥 Utilisateurs/jour: ${data.dailyActiveUsers}
⏰ Uptime: ${up.days || 0}d ${up.hours || 0}h

🌟 Top Auteur: ${data.topAuthors?.[0]?._id || "Unknown"}`
          )
        );
      } catch (err) {
        return output.reply(handleError(err, "récupérer les stats"));
      }
    }

    /* ========== LIKE ========== */
    if (sub === "like") {
      const id = Number(args[1]);
      if (isNaN(id)) return output.reply(box("⚠️ ID invalide."));
      try {
        const { data } = await axios.post(
          `${GOATSTOR}/api/items/${id}/like`
        );
        return output.reply(
          box(`💝 Like ajouté avec succès\nTotal likes: ${data.likes}`)
        );
      } catch (err) {
        return output.reply(handleError(err, "liker la commande"));
      }
    }

    /* ========== UPLOAD ========== */
    if (sub === "upload") {
      const file = args[1];
      if (!file) return output.reply(box("⚠️ Nom du fichier requis."));

      const filePath = path.join(
        process.cwd(),
        "CommandFiles/commands",
        file.endsWith(".ts") ? file : `${file}.ts`
      );

      if (!fs.existsSync(filePath))
        return output.reply(box("❌ Fichier introuvable."));

      try {
        const code = fs.readFileSync(filePath, "utf-8");
        const cmd = await import(filePath);

        const payload = {
          itemName: cmd.meta?.name || file,
          description: cmd.meta?.description || "CassidyBot command",
          type: "GoatBot",
          code,
          authorName: "Christus dev AI",
        };

        const res = await axios.post(`${GOATSTOR}/v1/paste`, payload);
        return output.reply(
          cassidyBox({
            ...payload,
            itemID: res.data.itemID,
            views: 0,
            likes: 0,
            link: res.data.link,
          })
        );
      } catch (err) {
        return output.reply(box("❌ Échec de l'upload."));
      }
    }

    return output.reply(box("⚠️ Sous-commande inconnue."));
  } catch (err) {
    console.error("GoatStor TS Error:", err);
    return output.reply(box("❌ Erreur inattendue."));
  }
});
