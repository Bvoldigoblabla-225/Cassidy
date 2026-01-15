import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { StrictOutputForm } from "output-cassidy";
import path from "path";
import * as fs from "fs";

const cmd = easyCMD({
  name: "chrisgpt",
  meta: {
    otherNames: ["cgpt", "christusgpt"],
    author: "Christus",
    description:
      "L'intelligence artificielle Christus GPT, conçue pour répondre à toutes vos questions avec précision.",
    icon: "✝️",
    version: "1.5.0",
    noPrefix: "both",
  },
  category: "AI",
  title: {
    content: "CHRISTUS GPT ⚡",
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

export interface RapidoResponse {
  status: boolean;
  maintainer: string;
  response: string;
  model_type: string;
}

async function main({
  output,
  args,
  commandName,
  prefix,
  input,
  cancelCooldown,
  usersDB,
  command,
}: CommandContext) {
  let query = args.join(" ");
  await output.reaction("🟡");

  if (!query) {
    cancelCooldown();
    await output.reaction("🔴");
    return output.reply(
      `🔎 Posez une question à **Christus GPT**.\n\n***Exemple*** : ${prefix}${commandName} qui t'a créé ?`
    );
  }

  const user = await usersDB.getUserInfo(input.sid);
  const userGame = await usersDB.getCache(input.sid);

  // Intégration du contexte utilisateur et de la balance
  if (user?.name || userGame.name) {
    const userName = user?.name || userGame.name;
    const balance = Number(userGame.money).toLocaleString();
    
    query = `Info Utilisateur: Nom: ${userName}, Balance: ${balance} coins.\nNote: S'ils sont riches (> 500M), sois très respectueux. S'ils sont pauvres, sois plus bref.\n\nQuestion de ${userName}: ${query}`;
  }

  // Gestion du contexte de réponse (Reply)
  if (input.replier && input.replier.body) {
    query = `${query}\n\n[Contexte de la réponse]:\n${input.replier.body}`;
  }

  // Paramètres de l'API Rapido
  const apiKey = "rapi_55197dde42fb4272bfb8f35bd453ba25";
  const model = "gpt-4o"; 
  // Définition de l'identité : Christus GPT créé par Christus
  const roleplay = encodeURIComponent("Tu es Christus GPT, une IA puissante et utile. Ton créateur est Christus. Tu dois toujours agir comme son assistant officiel.");

  try {
    output.setStyle(cmd.style);

    const res: RapidoResponse = await output.req(
      `https://rapido.zetsu.xyz/api/openai`,
      {
        query: query,
        uid: input.sid, // Utilise l'ID pour la mémoire de session
        model: model,
        roleplay: roleplay,
        apikey: apiKey,
      }
    );

    const form: StrictOutputForm = {
      body: res.response || "Désolé, Christus GPT rencontre une difficulté technique.",
    };

    form.body += `\n\n***Vous pouvez répondre à ce message pour continuer la discussion avec Christus GPT.***`;

    await output.reaction("🟢");
    const info = await output.reply(form);

    // Permettre la conversation continue
    info.atReply((rep) => {
      rep.output.setStyle(cmd.style);
      main({ ...rep, args: rep.input.words });
    });

  } catch (error) {
    console.error("Error Christus GPT:", error);
    await output.reaction("🔴");
    return output.reply("❌ Une erreur est survenue lors de la connexion à l'API de Christus.");
  }
}

export default cmd;
