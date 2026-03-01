require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType
} = require("discord.js");

const express = require("express");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const spamMap = new Map();

client.once("ready", () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    // 🔐 Anti Link
    if (message.content.includes("http")) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await message.delete().catch(() => {});
            return message.channel.send("🚫 الروابط ممنوعة !");
        }
    }

    // 🚫 Anti Spam
    const userData = spamMap.get(message.author.id) || { count: 0 };
    userData.count++;
    spamMap.set(message.author.id, userData);

    setTimeout(() => {
        userData.count = 0;
    }, 5000);

    if (userData.count >= 5) {
        await message.delete().catch(() => {});
        return message.channel.send("🚫 Stop Spam !");
    }

    // 📜 Logs
    const logChannel = message.guild.channels.cache.find(c => c.name === "logs");
    if (logChannel) {
        logChannel.send(`📌 ${message.author.tag}: ${message.content}`);
    }

    // 🎫 Ticket Panel
    if (message.content === "!ticketpanel") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return message.reply("❌ Admin only");

        const button = new ButtonBuilder()
            .setCustomId("create_ticket")
            .setLabel("🎫 Open Ticket")
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        return message.channel.send({
            content: "اضغط باش تحل تيكت 🎫",
            components: [row]
        });
    }

    // 💬 كوموند القديمة +message
    if (message.content.startsWith("+message")) {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
            return message.reply("❌ لازمك Admin");

        const args = message.content.slice(8).trim();
        if (!args) return message.reply("⚠️ اكتب النص بعد +message");

        await message.delete().catch(() => {});

        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setAuthor({
                name: message.guild.name,
                iconURL: message.guild.iconURL()
            })
            .setTitle("📢 إعلان جديد")
            .setDescription(args)
            .setThumbnail(message.author.displayAvatarURL())
            .setFooter({
                text: `By ${message.author.username}`,
                iconURL: message.author.displayAvatarURL()
            })
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }
});

// 🎫 Button Interaction
client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;

    // فتح تيكت
    if (interaction.customId === "create_ticket") {

        const existing = interaction.guild.channels.cache.find(
            c => c.name === `ticket-${interaction.user.id}`
        );

        if (existing)
            return interaction.reply({ content: "❌ عندك تيكت مفتوح!", ephemeral: true });

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
            content: `🎫 مرحبا ${interaction.user}، اكتب مشكلتك هنا.`,
            components: [row]
        });

        return interaction.reply({ content: "✅ تم إنشاء التيكت!", ephemeral: true });
    }

    // غلق تيكت
    if (interaction.customId === "close_ticket") {
        await interaction.reply("🔒 سيتم غلق التيكت بعد 5 ثواني...");
        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
    }
});

// 🌐 Web Server (Render)
const app = express();
app.get("/", (req, res) => {
    res.send("Bot is alive!");
});
app.listen(3000, () => console.log("🌍 Web server running"));

client.login(process.env.TOKEN);
