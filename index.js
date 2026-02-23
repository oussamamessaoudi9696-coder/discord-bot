const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require("discord.js");
const express = require("express");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

// ✅ كي البوت يدخل
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ✅ الأوامر
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("+message")) {

    // 🔒 كان موش Admin يوقف
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ كان الإدارة تنجم تستعمل الأمر هذا.");
    }

    const args = message.content.slice(8).trim();
    if (!args) return message.reply("⚠️ أكتب الرسالة بعد +message");

    await message.delete().catch(() => {});

    // 💎 الكادر الاحترافي
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setAuthor({
        name: message.guild.name,
        iconURL: message.guild.iconURL()
      })
      .setTitle("📢 إعلان رسمي")
      .setDescription(`> ${args}`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setFooter({
        text: `By ${message.author.username}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  }
});

// 🌐 Web Server باش يخدم في Render
const app = express();
app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

app.listen(3000, () => {
  console.log("🌍 Web server is running");
});

// 🔑 تسجيل الدخول
client.login(process.env.TOKEN);
