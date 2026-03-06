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

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} Online`);
});

function log(guild, name) {
  return guild.channels.cache.find(c => c.name === name);
}

/* ================= LOGS ================= */
client.on("guildMemberAdd", member => {
  const ch = log(member.guild, "join-players-logs");
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor("Green")
    .setTitle("🟢 Player Joined")
    .setDescription(`${member} joined`)
    .setTimestamp();
  ch.send({ embeds: [embed] });
});

client.on("guildMemberRemove", member => {
  const ch = log(member.guild, "left-player-logs");
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor("Red")
    .setTitle("🔴 Player Left")
    .setDescription(`${member.user.tag} left`)
    .setTimestamp();
  ch.send({ embeds: [embed] });
});

client.on("guildBanAdd", ban => {
  const ch = log(ban.guild, "ban-logs");
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor("DarkRed")
    .setTitle("🔨 User Banned")
    .setDescription(`${ban.user.tag} banned`)
    .setTimestamp();
  ch.send({ embeds: [embed] });
});

client.on("guildBanRemove", ban => {
  const ch = log(ban.guild, "unban-logs");
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor("Aqua")
    .setTitle("♻️ User Unbanned")
    .setDescription(`${ban.user.tag} unbanned`)
    .setTimestamp();
  ch.send({ embeds: [embed] });
});

client.on("guildMemberUpdate", (oldMember, newMember) => {
  if (!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {
    const ch = log(newMember.guild, "timeout-logs");
    if (!ch) return;
    const embed = new EmbedBuilder()
      .setColor("Orange")
      .setTitle("⏳ User Timed Out")
      .setDescription(`${newMember.user.tag}`)
      .setTimestamp();
    ch.send({ embeds: [embed] });
  }
});

client.on("guildMemberRemove", async member => {
  const logs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
  const logEntry = logs.entries.first();
  if (!logEntry) return;
  if (logEntry.target.id !== member.id) return;
  const ch = log(member.guild, "kick-logs");
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor("Orange")
    .setTitle("👢 User Kicked")
    .setDescription(`${member.user.tag}`)
    .addFields({ name: "By", value: `<@${logEntry.executor.id}>` })
    .setTimestamp();
  ch.send({ embeds: [embed] });
});

/* ================= MESSAGE SYSTEM ================= */
client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;

  // ===== Ticket Panel =====
  if (message.content === "!ticketpanel") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const embed = new EmbedBuilder()
      .setColor("#00ff99")
      .setTitle("🎮 Gaming Community Support")
      .setDescription("اضغط على الزر لفتح تذكرة 🎟️")
      .setTimestamp();
    const button = new ButtonBuilder()
      .setCustomId("create_ticket")
      .setLabel("🎫 Open Ticket")
      .setStyle(ButtonStyle.Success);
    const row = new ActionRowBuilder().addComponents(button);
    return message.channel.send({ embeds: [embed], components: [row] });
  }

  // ===== Welcome "." =====
  if (message.content === ".") {
    return message.channel.send(`Welcome ${message.author} to Gaming Community! 🎉`);
  }

  // ===== Anti Link =====
  if (message.content.includes("http")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await message.delete().catch(() => {});
      return message.channel.send("🚫 الروابط ممنوعة هنا");
    }
  }

  // ===== Anti Spam =====
  const userData = spamMap.get(message.author.id) || { count: 0 };
  userData.count++;
  spamMap.set(message.author.id, userData);
  setTimeout(() => { userData.count = 0; }, 5000);
  if (userData.count >= 5) {
    await message.delete().catch(() => {});
    return message.channel.send("🚫 Stop Spam");
  }

  // ===== Commands =====
  if (message.content.startsWith("+clear")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;
    const amount = parseInt(message.content.split(" ")[1]);
    if (!amount) return;
    await message.channel.bulkDelete(amount, true);
    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setDescription(`🧹 Deleted ${amount} messages`);
    return message.channel.send({ embeds: [embed] }).then(m => setTimeout(() => m.delete(), 3000));
  }

  if (message.content.startsWith("+ban")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
    const user = message.mentions.members.first();
    if (!user) return;
    const reason = message.content.split(" ").slice(2).join(" ") || "No reason";
    await user.ban({ reason });
    const embed = new EmbedBuilder()
      .setColor("DarkRed")
      .setTitle("🔨 Ban")
      .setDescription(`${user.user.tag} banned`)
      .addFields({ name: "Reason", value: reason })
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
    const ch = log(message.guild, "ban-logs");
    if (ch) ch.send({ embeds: [embed] });
  }

  if (message.content.startsWith("+kick")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;
    const user = message.mentions.members.first();
    if (!user) return;
    const reason = message.content.split(" ").slice(2).join(" ") || "No reason";
    await user.kick(reason);
    const embed = new EmbedBuilder()
      .setColor("Orange")
      .setTitle("👢 Kick")
      .setDescription(`${user.user.tag}`)
      .addFields({ name: "Reason", value: reason })
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
    const ch = log(message.guild, "kick-logs");
    if (ch) ch.send({ embeds: [embed] });
  }

  if (message.content.startsWith("+timeout")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;
    const user = message.mentions.members.first();
    if (!user) return;
    const time = 10 * 60 * 1000;
    await user.timeout(time);
    const embed = new EmbedBuilder()
      .setColor("Orange")
      .setTitle("⏳ Timeout")
      .setDescription(`${user.user.tag} timed out`)
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
    const ch = log(message.guild, "timeout-logs");
    if (ch) ch.send({ embeds: [embed] });
  }

  if (message.content.startsWith("+message")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const msg = message.content.slice(8);
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("📢 Announcement")
      .setDescription(msg)
      .setTimestamp();
    message.delete();
    message.channel.send({ embeds: [embed] });
  }
});

/* ================= TICKET BUTTON ================= */
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "create_ticket") {
    const existing = interaction.guild.channels.cache.find(
      c => c.name === `ticket-${interaction.user.id}`
    );
    if (existing) return interaction.reply({ content: "❌ عندك تذكرة مفتوحة", ephemeral: true });

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const closeBtn = new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(closeBtn);
    channel.send({ content: `Welcome ${interaction.user}`, components: [row] });
    interaction.reply({ content: "✅ Ticket Created", ephemeral: true });
  }

  if (interaction.customId === "close_ticket") {
    interaction.reply("Closing...");
    setTimeout(() => interaction.channel.delete(), 3000);
  }

  // ===== VOICE BUTTONS =====
  const [action, channelId] = interaction.customId.split("_");
  if (!voiceOwners.has(channelId)) return;
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return;
  if (voiceOwners.get(channelId) !== interaction.user.id) return interaction.reply({ content: "❌ هذا موش رومك", ephemeral: true });

  if (action === "lock") { await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false }); interaction.reply({ content: "🔒 Locked", ephemeral: true }); }
  if (action === "unlock") { await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: true }); interaction.reply({ content: "🔓 Unlocked", ephemeral: true }); }
  if (action === "rename") { await channel.setName(`🎤 ${interaction.user.username}`); interaction.reply({ content: "✏ Renamed", ephemeral: true }); }
  if (action === "limit") { await channel.setUserLimit(4); interaction.reply({ content: "👥 Limit set", ephemeral: true }); }
  if (action === "kick") { channel.members.forEach(m => { if (m.id !== interaction.user.id) m.voice.disconnect(); }); interaction.reply({ content: "👢 Done", ephemeral: true }); }
});

/* ================= VOICE GENERATOR ================= */
client.on("voiceStateUpdate", async (oldState, newState) => {
  const generator = newState.guild.channels.cache.find(c => c.name === "Generator");
  if (newState.channel && generator && newState.channel.id === generator.id) {
    const channel = await newState.guild.channels.create({
      name: `🎤 ${newState.member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: generator.parent
    });
    voiceOwners.set(channel.id, newState.member.id);
    await newState.member.voice.setChannel(channel);

    const panel = newState.guild.channels.cache.find(c => c.name === "interface");
    if (panel) {
      const embed = new EmbedBuilder()
        .setColor("Purple")
        .setTitle("🎛 Voice Control Panel")
        .setDescription(`Room: ${channel.name}`);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`lock_${channel.id}`).setLabel("Lock").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`unlock_${channel.id}`).setLabel("Unlock").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`rename_${channel.id}`).setLabel("Rename").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`limit_${channel.id}`).setLabel("Limit 4").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`kick_${channel.id}`).setLabel("Kick All").setStyle(ButtonStyle.Danger)
      );
      panel.send({ embeds: [embed], components: [row] });
    }
  }

  if (oldState.channel && voiceOwners.has(oldState.channel.id) && oldState.channel.members.size === 0) {
    setTimeout(() => {
      if (oldState.channel.members.size === 0) {
        oldState.channel.delete().catch(() => {});
        voiceOwners.delete(oldState.channel.id);
      }
    }, 1000);
  }
});

/* ================= WEB SERVER ================= */
const app = express();
app.get("/", (req, res) => res.send("Bot Online"));
app.listen(3000, () => console.log("🌐 Web Server Running"));

client.login(process.env.TOKEN);
