// m.p.

// Token obfuscation
const secret = require('./token.js');

// Mouse/keyboard tools
const Robot = require("robotjs");

// Discord bot
const Discord = require('discord.js');
const client = new Discord.Client();

client.once('ready', () => {
    console.log(`Gate opened as ${client.user.tag}!`);
});

client.login(secret.token);
