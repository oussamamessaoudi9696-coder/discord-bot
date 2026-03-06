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
intents:[
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.GuildModeration,
GatewayIntentBits.GuildVoiceStates
]
});

const spamMap=new Map();
const voiceOwners=new Map();

client.once("ready",()=>{
console.log(`✅ ${client.user.tag} Online`);
});

function log(guild,name){
return guild.channels.cache.find(c=>c.name===name);
}

/* JOIN LOG */

client.on("guildMemberAdd",member=>{
const ch=log(member.guild,"join-players-logs");
if(!ch)return;

const embed=new EmbedBuilder()
.setColor("Green")
.setTitle("🟢 Player Joined")
.setDescription(`${member} joined`)
.setTimestamp();

ch.send({embeds:[embed]});
});

/* LEAVE LOG */

client.on("guildMemberRemove",member=>{
const ch=log(member.guild,"left-player-logs");
if(!ch)return;

const embed=new EmbedBuilder()
.setColor("Red")
.setTitle("🔴 Player Left")
.setDescription(`${member.user.tag} left`)
.setTimestamp();

ch.send({embeds:[embed]});
});

/* MESSAGE SYSTEM */

client.on("messageCreate",async message=>{

if(!message.guild||message.author.bot)return;

/* ANTI LINK */

if(message.content.includes("http")){
if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator)){
await message.delete().catch(()=>{});
return message.channel.send("🚫 Links not allowed");
}
}

/* ANTI SPAM */

const data=spamMap.get(message.author.id)||{count:0};
data.count++;
spamMap.set(message.author.id,data);

setTimeout(()=>{data.count=0},5000);

if(data.count>=5){
await message.delete().catch(()=>{});
return message.channel.send("🚫 Stop Spam");
}

/* CLEAR */

if(message.content.startsWith("+clear")){

if(!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))return;

const amount=parseInt(message.content.split(" ")[1]);

if(!amount)return;

await message.channel.bulkDelete(amount,true);

const embed=new EmbedBuilder()
.setColor("Blue")
.setDescription(`🧹 Deleted ${amount} messages`);

message.channel.send({embeds:[embed]}).then(m=>setTimeout(()=>m.delete(),3000));

}

/* BAN */

if(message.content.startsWith("+ban")){

if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))return;

const user=message.mentions.members.first();
if(!user)return;

const reason=message.content.split(" ").slice(2).join(" ")||"No reason";

await user.ban({reason});

const embed=new EmbedBuilder()
.setColor("DarkRed")
.setTitle("🔨 Ban")
.setDescription(`${user.user.tag} banned`)
.addFields({name:"Reason",value:reason})
.setTimestamp();

message.channel.send({embeds:[embed]});

const ch=log(message.guild,"ban-logs");
if(ch)ch.send({embeds:[embed]});

}

/* KICK */

if(message.content.startsWith("+kick")){

if(!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))return;

const user=message.mentions.members.first();
if(!user)return;

const reason=message.content.split(" ").slice(2).join(" ")||"No reason";

await user.kick(reason);

const embed=new EmbedBuilder()
.setColor("Orange")
.setTitle("👢 Kick")
.setDescription(`${user.user.tag} kicked`)
.addFields({name:"Reason",value:reason})
.setTimestamp();

message.channel.send({embeds:[embed]});

const ch=log(message.guild,"kick-logs");
if(ch)ch.send({embeds:[embed]});

}

/* TIMEOUT */

if(message.content.startsWith("+timeout")){

if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))return;

const user=message.mentions.members.first();
if(!user)return;

const time=10*60*1000;

await user.timeout(time);

const embed=new EmbedBuilder()
.setColor("Purple")
.setTitle("⏳ Timeout")
.setDescription(`${user.user.tag} timed out`)
.setTimestamp();

message.channel.send({embeds:[embed]});

const ch=log(message.guild,"timeout-logs");
if(ch)ch.send({embeds:[embed]});

}

/* ANNOUNCEMENT */

if(message.content.startsWith("+message")){

if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator))return;

const msg=message.content.slice(8);

const embed=new EmbedBuilder()
.setColor("#5865F2")
.setTitle("📢 Announcement")
.setDescription(msg)
.setTimestamp();

message.delete();

message.channel.send({embeds:[embed]});

}

/* TICKET PANEL */

if(message.content==="!ticketpanel"){

if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator))return;

const embed=new EmbedBuilder()
.setColor("#5865F2")
.setTitle("🎫 Support Ticket")
.setDescription("Click to open ticket");

const btn=new ButtonBuilder()
.setCustomId("ticket")
.setLabel("Open Ticket")
.setStyle(ButtonStyle.Success);

const row=new ActionRowBuilder().addComponents(btn);

message.channel.send({embeds:[embed],components:[row]});

}

});

/* TICKET BUTTON */

client.on("interactionCreate",async interaction=>{

if(!interaction.isButton())return;

if(interaction.customId==="ticket"){

const ch=await interaction.guild.channels.create({
name:`ticket-${interaction.user.username}`,
type:ChannelType.GuildText,
permissionOverwrites:[
{ id:interaction.guild.id,deny:[PermissionsBitField.Flags.ViewChannel]},
{ id:interaction.user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages]}
]
});

const btn=new ButtonBuilder()
.setCustomId("close")
.setLabel("Close")
.setStyle(ButtonStyle.Danger);

const row=new ActionRowBuilder().addComponents(btn);

ch.send({content:`Welcome ${interaction.user}`,components:[row]});

interaction.reply({content:"✅ Ticket Created",ephemeral:true});

}

if(interaction.customId==="close"){

interaction.reply("Closing...");
setTimeout(()=>interaction.channel.delete(),3000);

}

});

/* VOICE GENERATOR */

client.on("voiceStateUpdate",async(oldState,newState)=>{

const generator=newState.guild.channels.cache.find(c=>c.name==="Generator");

if(newState.channel && generator && newState.channel.id===generator.id){

const channel=await newState.guild.channels.create({
name:`🎤 ${newState.member.user.username}`,
type:ChannelType.GuildVoice,
parent:generator.parent
});

voiceOwners.set(channel.id,newState.member.id);

await newState.member.voice.setChannel(channel);

const panel=newState.guild.channels.cache.find(c=>c.name==="interface");

if(panel){

const embed=new EmbedBuilder()
.setColor("Purple")
.setTitle("🎛 Voice Control Panel")
.setDescription(`Room: ${channel.name}`);

const row=new ActionRowBuilder().addComponents(

new ButtonBuilder().setCustomId(`lock_${channel.id}`).setLabel("Lock").setStyle(ButtonStyle.Secondary),

new ButtonBuilder().setCustomId(`unlock_${channel.id}`).setLabel("Unlock").setStyle(ButtonStyle.Success),

new ButtonBuilder().setCustomId(`rename_${channel.id}`).setLabel("Rename").setStyle(ButtonStyle.Primary),

new ButtonBuilder().setCustomId(`limit_${channel.id}`).setLabel("Limit 4").setStyle(ButtonStyle.Secondary),

new ButtonBuilder().setCustomId(`kick_${channel.id}`).setLabel("Kick All").setStyle(ButtonStyle.Danger)

);

panel.send({embeds:[embed],components:[row]});

}

}

/* DELETE PRIVATE VOICE */

if(oldState.channel){

if(voiceOwners.has(oldState.channel.id)&&oldState.channel.members.size===0){

setTimeout(()=>{

if(oldState.channel.members.size===0){

oldState.channel.delete().catch(()=>{});
voiceOwners.delete(oldState.channel.id);

}

},1000);

}

}

});

/* VOICE BUTTONS */

client.on("interactionCreate",async interaction=>{

if(!interaction.isButton())return;

const[action,channelId]=interaction.customId.split("_");

if(!voiceOwners.has(channelId))return;

const channel=interaction.guild.channels.cache.get(channelId);

if(voiceOwners.get(channelId)!==interaction.user.id)
return interaction.reply({content:"❌ موش رومك",ephemeral:true});

if(action==="lock"){
await channel.permissionOverwrites.edit(interaction.guild.id,{Connect:false});
interaction.reply({content:"🔒 Locked",ephemeral:true});
}

if(action==="unlock"){
await channel.permissionOverwrites.edit(interaction.guild.id,{Connect:true});
interaction.reply({content:"🔓 Unlocked",ephemeral:true});
}

if(action==="rename"){
await channel.setName(`🎤 ${interaction.user.username}`);
interaction.reply({content:"✏ Renamed",ephemeral:true});
}

if(action==="limit"){
await channel.setUserLimit(4);
interaction.reply({content:"👥 Limit set",ephemeral:true});
}

if(action==="kick"){
channel.members.forEach(m=>{
if(m.id!==interaction.user.id)m.voice.disconnect();
});
interaction.reply({content:"👢 Done",ephemeral:true});
}

});

/* WEB SERVER */

const app=express();
app.get("/",(req,res)=>res.send("Bot Online"));
app.listen(3000,()=>console.log("🌐 Web Server Running"));

client.login(process.env.TOKEN);
