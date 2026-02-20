const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// كي يولي Online
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.content.startsWith("+message")) {

    const args = message.content.slice(8).trim();

    if (!args) return;

    // يمسح المساج متاعك
    await message.delete().catch(() => {});

    // يبعث المساج بالبـوت
    message.channel.send(args);
  }
});

// تشغيل Web Server باش Render ما يطيحوش
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

app.listen(3000, () => {
  console.log("Web server is running");
});

// تسجيل الدخول
client.login(process.env.TOKEN);
