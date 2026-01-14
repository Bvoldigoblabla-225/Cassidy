// @ts-check
import { UNIRedux } from "@cassidy/unispectra";

export const meta = {
  name: "leave",
  author: "Christus",
  version: "4.0.1",
  description: "Envoie un message lorsqu'un membre quitte ou est expulsé du groupe.",
  supported: "^4.0.0",
  order: 10,
  type: "plugin",
  after: ["input", "output"],
};

/**
 * @param {CommandContext} obj
 */
export async function use(obj) {
  // Suppression de threadsData et usersData de la déstructuration si ils sont undefined
  const { event, api, output } = obj;

  if (event.logMessageType !== "log:unsubscribe") {
    return obj.next();
  }

  const { threadID } = event;
  const { leftParticipantFbId } = event.logMessageData;
  const botID = api.getCurrentUserID();

  if (leftParticipantFbId === botID) {
    return obj.next();
  }

  try {
    // Tentative de récupération des données via les utilitaires globaux ou le contexte
    // Si obj.threadsData n'existe pas, on tente de passer par global.Cassidy ou global.db
    const threadsManager = obj.threadsData || global?.Cassidy?.threadsData;
    const usersManager = obj.usersData || global?.Cassidy?.usersData;

    if (!threadsManager) {
        console.error("[Leave Plugin] Database Manager non trouvé dans le contexte.");
        return obj.next();
    }

    const thread = await threadsManager.get(threadID);
    
    // Si pas de données groupe ou si désactivé
    if (!thread || !thread.settings?.sendLeaveMessage) {
      return obj.next();
    }

    const userName = usersManager 
        ? await usersManager.getName(leftParticipantFbId) 
        : (await api.getUserInfo(leftParticipantFbId))[leftParticipantFbId].name;
        
    const threadName = thread.threadName || "ce groupe";
    
    const hours = new Date().getHours();
    let session = "soir";
    if (hours <= 10) session = "matin";
    else if (hours <= 12) session = "midi";
    else if (hours <= 18) session = "après-midi";

    const type = leftParticipantFbId == event.author ? "a quitté" : "a été expulsé de";

    let leaveMessage = thread.data?.leaveMessage || "{userName} {type} le groupe.";

    leaveMessage = leaveMessage
      .replace(/\{userName\}|\{userNameTag\}/g, userName)
      .replace(/\{type\}/g, type)
      .replace(/\{threadName\}|\{boxName\}/g, threadName)
      .replace(/\{time\}/g, `${hours}h`)
      .replace(/\{session\}/g, session);

    const form = {
      body: `📤 | ${leaveMessage}\n${UNIRedux.standardLine}\nBon vent !`,
      mentions: leaveMessage.includes("{userNameTag}") ? [{ tag: userName, id: leftParticipantFbId }] : []
    };

    return output.replyStyled(form, {
      title: "NOTIFICATION DE DÉPART",
      titleFont: "none",
      contentFont: "none",
    });

  } catch (err) {
    console.error("❌ Error in leave plugin:", err);
  }

  return obj.next();
}
