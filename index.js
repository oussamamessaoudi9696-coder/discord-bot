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

/* ================= TICKET BUTTONS ================= */

client.on("interactionCreate", async (interaction) => {
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
  }

  if (interaction.customId === "close_ticket") {
    await interaction.reply("🔒 سيتم غلق التذكرة بعد 5 ثواني...");
    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
});

/* ================= VOICE GENERATOR + SAFE DELETE ================= */

client.on("voiceStateUpdate", async (oldState, newState) => {

  // ===== CREATE PRIVATE VOICE =====
  if (newState.channel && newState.channel.name === "Generator") {

    const channel = await newState.guild.channels.create({
      name: `🎤 ${newState.member.user.username}`,
      type: ChannelType.GuildVoice,
      parent: newState.channel.parent
    });

    voiceOwners.set(channel.id, newState.member.id);
    await newState.member.voice.setChannel(channel);

    const panelChannel = newState.guild.channels.cache.find(c => c.name === "interface");
    if (panelChannel) {

      const embed = new EmbedBuilder()
        .setColor("#8A2BE2")
        .setTitle("🎛 Voice Control Panel")
        .setDescription("تحكم في رومك الصوتي من هنا")
        .addFields({ name: "🎤 Channel", value: channel.name })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`lock_${channel.id}`).setLabel("🔒 Lock").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`unlock_${channel.id}`).setLabel("🔓 Unlock").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`rename_${channel.id}`).setLabel("✏ Rename").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`limit_${channel.id}`).setLabel("👥 Limit 4").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`kick_${channel.id}`).setLabel("👢 Kick All").setStyle(ButtonStyle.Danger)
      );

      panelChannel.send({ embeds: [embed], components: [row] });
    }
  }

  // ===== AUTO DELETE ONLY GENERATED VOICE =====
  if (oldState.channel && oldState.channel.type === ChannelType.GuildVoice) {

    // نمسحو كان الروم معمول من البوت
    if (!voiceOwners.has(oldState.channel.id)) return;

    setTimeout(() => {
      if (oldState.channel.members.size === 0) {
        oldState.channel.delete().catch(() => {});
        voiceOwners.delete(oldState.channel.id);
      }
    }, 500);
  }

});

/* ================= VOICE BUTTONS ================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const [action, channelId] = interaction.customId.split("_");
  if (!voiceOwners.has(channelId)) return;

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return;

  if (voiceOwners.get(channelId) !== interaction.user.id)
    return interaction.reply({ content: "❌ هذا موش رومك", ephemeral: true });

  if (action === "lock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
    return interaction.reply({ content: "🔒 تم قفل الروم", ephemeral: true });
  }

  if (action === "unlock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
    return interaction.reply({ content: "🔓 تم فتح الروم", ephemeral: true });
  }

  if (action === "rename") {
    await channel.setName(`🎤 ${interaction.user.username}`);
    return interaction.reply({ content: "✏ تم تغيير الاسم", ephemeral: true });
  }

  if (action === "limit") {
    await channel.setUserLimit(4);
    return interaction.reply({ content: "👥 تم تحديد الحد بـ 4", ephemeral: true });
  }

  if (action === "kick") {
    channel.members.forEach(member => {
      if (member.id !== interaction.user.id)
        member.voice.disconnect().catch(() => {});
    });
    return interaction.reply({ content: "👢 تم طرد الجميع", ephemeral: true });
  }
});

/* ================= WEB SERVER ================= */

const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(3000, () => console.log("🌐 Web server running"));

client.login(process.env.TOKEN);
