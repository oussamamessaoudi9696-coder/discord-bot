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

/* ================= ANTI LINK + SPAM + COMMANDS ================= */

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  // Anti Link
  if (message.content.includes("http")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await message.delete().catch(() => {});
      return message.channel.send("🚫 no line 🤝");
    }
  }

  // Anti Spam
  const data = spamMap.get(message.author.id) || { count: 0 };
  data.count++;
  spamMap.set(message.author.id, data);

  setTimeout(() => data.count = 0, 5000);

  if (data.count >= 5) {
    await message.delete().catch(()=>{});
    return message.channel.send("🚫 Stop Spam!");
  }

  // Ticket Panel
  if (message.content === "!ticketpanel") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only");

    const embed = new EmbedBuilder()
      .setColor("#00ff99")
      .setTitle("🎮 Support System")
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

  // Announcement
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

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;

  /* ===== TICKET ===== */

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

    await channel.send({ content: `👋 مرحبا ${interaction.user}`, components: [row] });
    return interaction.reply({ content: "✅ تم إنشاء التذكرة", ephemeral: true });
  }

  if (interaction.customId === "close_ticket") {
    await interaction.reply({ content: "🔒 سيتم الغلق بعد 5 ثواني...", ephemeral: true });
    setTimeout(() => interaction.channel.delete().catch(()=>{}), 5000);
  }

  /* ===== VOICE CONTROL PANEL ===== */

  const channel = interaction.member.voice.channel;
  if (!channel) return;

  if (!voiceOwners.has(channel.id)) return;
  if (voiceOwners.get(channel.id) !== interaction.user.id)
    return interaction.reply({ content: "❌ موش رومك", ephemeral: true });

  if (interaction.customId === "lock_voice") {
    await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
    return interaction.reply({ content: "🔒 تم القفل", ephemeral: true });
  }

  if (interaction.customId === "unlock_voice") {
    await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: null });
    return interaction.reply({ content: "🔓 تم الفتح", ephemeral: true });
  }

  if (interaction.customId === "limit_voice") {
    await channel.setUserLimit(2);
    return interaction.reply({ content: "👥 Limit = 2", ephemeral: true });
  }

  if (interaction.customId === "rename_voice") {
    await channel.setName(`🎤 ${interaction.user.username}-room`);
    return interaction.reply({ content: "✏ تم تغيير الاسم", ephemeral: true });
  }
});

/* ================= VOICE GENERATOR ================= */

client.on("voiceStateUpdate", async (oldState, newState) => {

  if (newState.channel && newState.channel.name === "Generator") {

    const channel = await newState.guild.channels.create({
      name: `🎤 ${newState.member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: newState.channel.parent
    });

    voiceOwners.set(channel.id, newState.member.id);
    await newState.member.voice.setChannel(channel);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("lock_voice")
        .setLabel("🔒 Lock")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("unlock_voice")
        .setLabel("🔓 Unlock")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("limit_voice")
        .setLabel("👥 Limit 2")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("rename_voice")
        .setLabel("✏ Rename")
        .setStyle(ButtonStyle.Secondary)
    );

    channel.send({ content: "Voice Control Panel", components: [row] });
  }

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
  return guild.channels.cache.find(
    c => c.name.toLowerCase() === name.toLowerCase()
  );
}

client.on("guildMemberAdd", member => {
  const ch = getLogChannel(member.guild, "join-players-logs");
  if (!ch) return;

  ch.send({ embeds: [new EmbedBuilder()
    .setColor("Green")
    .setTitle("🟢 Player Joined")
    .setDescription(member.user.tag)
    .setTimestamp()] });
});

client.on("guildMemberRemove", member => {
  const ch = getLogChannel(member.guild, "left-player-logs");
  if (!ch) return;

  ch.send({ embeds: [new EmbedBuilder()
    .setColor("Red")
    .setTitle("🔴 Player Left")
    .setDescription(member.user.tag)
    .setTimestamp()] });
});

/* ================= WEB SERVER ================= */

const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(3000);

client.login(process.env.TOKEN);
