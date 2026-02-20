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

client.on("messageCreate", message => {
  if (message.author.bot) return;

  // command +message
  if (message.content.startsWith("+message")) {

    const args = message.content.slice(8).trim();

    if (!args) {
      return message.channel.send("اكتب message بعد +message");
    }

    message.channel.send(args);
  }

  // ping test
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
