import { CanvCass } from "@cass-modules/CassieahExtras";

export const meta: CommandMeta = {
  name: "fpost",
  description: "Generate a fake FB post image via CanvCass",
  author: "Liane Cagara",
  version: "1.0.5",
  usage: "{prefix}{name} <caption>",
  category: "Media",
  permissions: [0],
  noPrefix: false,
  waitingTime: 5,
  requirement: "3.0.0",
  otherNames: ["fakepost"],
  icon: "📰",
  noLevelUI: true,
  noWeb: true,
};

export const style: CommandStyle = {
  title: "💬 Fake Post",
  contentFont: "fancy",
  titleFont: "bold",
};

export async function entry({
  cancelCooldown,
  output,
  args,
  prefix,
  commandName,
  uid,
  usersDB,
  userName,
  input,
}: CommandContext) {
  if (!args[0]) {
    cancelCooldown();
    return output.reply(
      `❌ Please enter a caption.
**Example**: ${prefix}${commandName} Ang cute mo bwiset.`
    );
  }

  if (!usersDB.isNumKey(uid) && !input.isAdmin) {
    return output.reply("❌ Only Facebook users can use this command.");
  }

  const pfpURL = await usersDB.getAvatarURL(uid);

  const argsText = args.join(" ");

  const i = await output.reply("⏳ ***Generating***\n\nPlease wait...");

  await usersDB.ensureUserInfo(uid);
  const info = await usersDB.getUserInfo(uid);

  if (info?.name === "Unknown User") {
    delete info.name;
  }

  const name = info?.name ?? userName;

  const caption = `${name} claims that ${argsText}`;
  let times = 0;

  while (true) {
    times++;
    try {
      const canv = new CanvCass(720, 720);
      canv.drawBox({
        rect: canv,
        fill: "white",
      });
      const margin = 15;

      await utils.delay(500);

      const pfp = await CanvCass.loadImage(pfpURL);

      await output.reply({
        body: `💬 Fake post from ***${name}***:`,
        attachment: await canv.toStream(),
      });

      await output.unsend(i.messageID);
      break;
    } catch (error) {
      if (times >= 4) {
        return output.error(error);
      }
      await utils.delay(1000);
      continue;
    }
  }
}
