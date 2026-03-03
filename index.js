const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  AuditLogEvent
} = require("discord.js");

const express = require("express");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const spamMap = new Map();
const voiceOwners = new Map();

/* ================= READY ================= */

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ================= ANTI LINK + SPAM ================= */

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  if (message.content.includes("http")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await message.delete().catch(() => {});
      return message.channel.send("🚫 الروابط ممنوعة هنا");
    }
  }

  const data = spamMap.get(message.author.id) || { count: 0 };
  data.count++;
  spamMap.set(message.author.id, data);

  setTimeout(() => data.count = 0, 5000);

  if (data.count >= 5) {
    await message.delete().catch(()=>{});
    return message.channel.send("🚫 Stop Spam!");
  }

  /* TICKET PANEL */
  if (message.content === "!ticketpanel") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only");

    const embed = new EmbedBuilder()
      .setColor("#00ff99")
      .setTitle("🎮 Gaming Community Support")
      .setDescription("اضغط لفتح تذكرة 🎟️")
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_ticket")
        .setLabel("🎫 Open Ticket")
        .setStyle(ButtonStyle.Success)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }

  /* ANNOUNCEMENT */
  if (message.content.startsWith("+message")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only");

    const text = message.content.slice(8).trim();
    if (!text) return message.reply("❌ اكتب النص بعد +message");

    await message.delete().catch(()=>{});

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("📢 Announcement")
      .setDescription(text)
      .setFooter({ text: `By: ${message.author.tag}` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
});

/* ================= TICKET SYSTEM ================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "create_ticket") {

    const existing = interaction.guild.channels.cache.find(
      c => c.name === `ticket-${interaction.user.id}`
    );
    if (existing)
      return interaction.reply({ content: "❌ عندك تذكرة مفتوحة", ephemeral: true });

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.id}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    channel.send({ content: `👋 مرحبا ${interaction.user}`, components: [row] });
    return interaction.reply({ content: "✅ تم إنشاء التذكرة", ephemeral: true });
  }

  if (interaction.customId === "close_ticket") {
    await interaction.reply("🔒 سيتم الغلق بعد 5 ثواني...");
    setTimeout(() => interaction.channel.delete().catch(()=>{}), 5000);
  }
});

/* ================= VOICE GENERATOR ================= */

client.on("voiceStateUpdate", async (oldState, newState) => {

  // إنشاء روم خاص
  if (newState.channel && newState.channel.name === "Generator") {

    const channel = await newState.guild.channels.create({
      name: `🎤 ${newState.member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: newState.channel.parent
    });

    voiceOwners.set(channel.id, newState.member.id);
    await newState.member.voice.setChannel(channel);
  }

  // حذف الرومات الخاصة فقط
  if (oldState.channel && voiceOwners.has(oldState.channel.id)) {
    setTimeout(() => {
      if (oldState.channel.members.size === 0) {
        oldState.channel.delete().catch(()=>{});
        voiceOwners.delete(oldState.channel.id);
      }
    }, 500);
  }
});

/* ================= LOG SYSTEM ================= */

function getLogChannel(guild, name) {
  return guild.channels.cache.find(c => c.name === name);
}

/* JOIN */
client.on("guildMemberAdd", member => {
  const ch = getLogChannel(member.guild, "Join-Players-Logs");
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor("Green")
    .setTitle("🟢 Player Joined")
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: "User", value: member.user.tag },
      { name: "ID", value: member.id }
    )
    .setTimestamp();

  ch.send({ embeds: [embed] });
});

/* LEAVE */
client.on("guildMemberRemove", member => {
  const ch = getLogChannel(member.guild, "Left-Player-Logs");
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor("Red")
    .setTitle("🔴 Player Left")
    .addFields({ name: "User", value: member.user.tag })
    .setTimestamp();

  ch.send({ embeds: [embed] });
});

/* BAN */
client.on("guildBanAdd", ban => {
  const ch = getLogChannel(ban.guild, "Ban-Logs");
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor("DarkRed")
    .setTitle("🚫 Member Banned")
    .addFields({ name: "User", value: ban.user.tag })
    .setTimestamp();

  ch.send({ embeds: [embed] });
});

/* UNBAN */
client.on("guildBanRemove", ban => {
  const ch = getLogChannel(ban.guild, "Unban-Logs");
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("🔓 Member Unbanned")
    .addFields({ name: "User", value: ban.user.tag })
    .setTimestamp();

  ch.send({ embeds: [embed] });
});

const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(3000);

client.login(process.env.TOKEN);
