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

// مثال command ping
client.on("messageCreate", message => {
  if (message.author.bot) return;

  if (message.content === "+message") {
    message.channel.send("مرحبا 👋 هذا مساج من البوت متاعك");
  }

  if (message.content === "ping") {
    message.reply("pong 🏓");
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
