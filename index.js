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
client.login("MTQ3NDQ4OTYzODkzMTY2MTAyMQ.G6_rHo.FT41yFclfPdbhpdss9SWOYqIjTEh9_QReZG-y8");
