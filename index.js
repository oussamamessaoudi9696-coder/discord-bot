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
    GatewayIntentBits.GuildModeration
  ]
});

const spamMap = new Map();

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ================= ANTI LINK + SPAM ================= */

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  // Anti Link
  if (message.content.includes("http")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await message.delete().catch(() => {});
      return message.channel.send("🚫 الروابط ممنوعة هنا");
    }
  }

  // Anti Spam
  const userData = spamMap.get(message.author.id) || { count: 0 };
  userData.count++;
  spamMap.set(message.author.id, userData);

  setTimeout(() => {
    userData.count = 0;
  }, 5000);

  if (userData.count >= 5) {
    await message.delete().catch(() => {});
    return message.channel.send("🚫 Stop Spam!");
  }

  /* ================= TICKET PANEL ================= */

  if (message.content === "!ticketpanel" && !message.channel.name.startsWith("ticket-")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only");

    const embed = new EmbedBuilder()
      .setColor("#00ff99")
      .setTitle("🎮 Gaming Community Support")
      .setDescription("اضغط على الزر لفتح تذكرة 🎟️")
      .setFooter({ text: "Gaming Community © 2026" })
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId("create_ticket")
      .setLabel("🎫 Open Ticket")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    return message.channel.send({ embeds: [embed], components: [row] });
  }

  /* ================= ANNOUNCEMENT ================= */

  if (message.content.startsWith("+message")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ Admin only");

    const args = message.content.slice(8).trim();
    if (!args) return message.reply("❌ اكتب النص بعد +message");

    await message.delete().catch(() => {});

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("📢 Announcement")
      .setDescription(args)
      .setFooter({ text: `By: ${message.author.tag}` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
});

/* ================= BUTTON INTERACTION ================= */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  // CREATE TICKET
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
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    const closeButton = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("🔒 Close Ticket")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeButton);

    channel.send({
      content: `👋 مرحبا ${interaction.user} اكتب مشكلتك هنا`,
      components: [row]
    });

    interaction.reply({ content: "✅ تم إنشاء التذكرة", ephemeral: true });

    const log = interaction.guild.channels.cache.find(c => c.name === "join-players-logs");
    if (log) log.send(`🎫 Ticket opened by ${interaction.user.tag}`);
  }

  // CLOSE TICKET
  if (interaction.customId === "close_ticket") {
    await interaction.reply("🔒 سيتم غلق التذكرة بعد 5 ثواني...");
    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
});

/* ================= LOGS SYSTEM ================= */

// Join
client.on("guildMemberAdd", member => {
  const channel = member.guild.channels.cache.find(c => c.name === "join-players-logs");
  if (!channel) return;
  channel.send(`🟢 Member Joined: ${member.user.tag}`);
});

// Leave
client.on("guildMemberRemove", member => {
  const channel = member.guild.channels.cache.find(c => c.name === "left-player-logs");
  if (!channel) return;
  channel.send(`🔴 Member Left: ${member.user.tag}`);
});

// Ban
client.on("guildBanAdd", ban => {
  const channel = ban.guild.channels.cache.find(c => c.name === "ban-logs");
  if (!channel) return;
  channel.send(`🔨 User Banned: ${ban.user.tag}`);
});

// Unban
client.on("guildBanRemove", ban => {
  const channel = ban.guild.channels.cache.find(c => c.name === "unban-logs");
  if (!channel) return;
  channel.send(`🔓 User Unbanned: ${ban.user.tag}`);
});

// Timeout
client.on("guildMemberUpdate", (oldMember, newMember) => {
  if (!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {
    const channel = newMember.guild.channels.cache.find(c => c.name === "timeout-logs");
    if (!channel) return;
    channel.send(`⏳ User Timed Out: ${newMember.user.tag}`);
  }
});

// Kick
client.on("guildMemberRemove", async member => {
  const logs = await member.guild.fetchAuditLogs({
    limit: 1,
    type: AuditLogEvent.MemberKick
  });

  const log = logs.entries.first();
  if (!log) return;

  const { executor, target } = log;
  if (target.id !== member.id) return;

  const channel = member.guild.channels.cache.find(c => c.name === "kick-logs");
  if (!channel) return;

  channel.send(`👢 User Kicked: ${member.user.tag} | By: ${executor.tag}`);
});

/* ================= WEB SERVER ================= */

const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(3000, () => console.log("🌐 Web server running"));

client.login(process.env.TOKEN);
