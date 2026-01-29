const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const express = require("express");

const VERIFY_ROLE_ID = "여기에_인증완료_역할_ID";
const VERIFY_CHANNEL_ID = "여기에_인증_채널_ID";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const pending = new Map();

/* 🌐 웹서버 (Railway용) */
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(3000, () => console.log("🌐 Web server running"));

/* 🔐 랜덤 코드 생성 */
function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
  const len = Math.floor(Math.random() * 3) + 5; // 5~7
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/* 🤖 준비 완료 */
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

/* 💬 메시지 처리 */
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  /* 👮 관리자만 !인증 가능 */
  if (msg.content === "!인증") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return msg.delete().catch(() => {});
    }

    if (msg.channel.id !== VERIFY_CHANNEL_ID) {
      return msg.delete().catch(() => {});
    }

    const button = new ButtonBuilder()
      .setCustomId("verify_start")
      .setLabel("인증 시작")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await msg.channel.send({
      content: "아래 버튼을 눌러 인증을 시작하세요.",
      components: [row]
    });

    return msg.delete().catch(() => {});
  }

  /* 🔢 인증 코드 입력 처리 */
  if (pending.has(msg.author.id)) {
    const data = pending.get(msg.author.id);

    if (msg.content === data.code) {
      const role = msg.guild.roles.cache.get(VERIFY_ROLE_ID);
      if (role) await msg.member.roles.add(role);
      pending.delete(msg.author.id);
    }

    return msg.delete().catch(() => {});
  }
});

/* 🖱️ 버튼 클릭 */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "verify_start") return;

  const code = makeCode();
  pending.set(interaction.user.id, { code });

  try {
    await interaction.user.send(`인증 코드: **${code}**`);
    await interaction.reply({ content: "DM을 확인하세요.", ephemeral: true });
  } catch {
    await interaction.reply({ content: "DM을 받을 수 없습니다.", ephemeral: true });
  }
});

client.login(process.env.TOKEN);
