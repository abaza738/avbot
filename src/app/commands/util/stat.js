const Discord = require('discord.js');
const { Command } = require('discord.js-commando');
const Mongo = require('../../utils/Mongo');

module.exports = class StatCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'stat',
      group: 'util',
      memberName: 'stat',
      aliases: ['stats'],
      description: 'Gives you the AvBot stats',
      examples: ['stat'],
      ownerOnly: true
    });
  }

  async run(msg) {
    if (msg.guild && !msg.channel.permissionsFor(msg.guild.me).has('EMBED_LINKS')) {
      return msg.reply(
        `AvBot doesn't have permissions to send Embeds in this channel. Please enable "Embed Links" under channel permissions for AvBot.`
      );
    }
    const guildsCount = (await this.client.shard.fetchClientValues('guilds.cache.size')).reduce((acc, guildCount) => acc + guildCount, 0);
    const commandsCount = await Mongo.getCommandCounts();

    let commandsMsg = '';
    commandsCount.counts
      .sort((a, b) => b.count - a.count)
      .forEach((c) => {
        commandsMsg += `${c.command} - ${c.count}\n`;
      });
    commandsMsg = commandsMsg.trim();

    const statsEmbed = new Discord.MessageEmbed()
      .setColor('#0099ff')
      .setTitle('AvBot Stats!')
      .setURL('https://avbot.in')
      .setThumbnail('https://avbot.in/assets/logo.png')
      .addFields(
        {
          name: 'Server Count',
          value: guildsCount
        },
        {
          name: 'Uptime',
          value: this.dhms(process.uptime())
        },
        {
          name: 'Commands Count',
          value: commandsMsg
        }
      )
      .setFooter(`${this.client.user.username} • @dr_ph4nt0m#0001`)
      .setTimestamp();

    return msg.embed(statsEmbed);
  }

  dhms = (t) => {
    const cd = 24 * 60 * 60;
    const ch = 60 * 60;
    const cm = 60;
    let d = Math.floor(t / cd);
    let h = Math.floor((t - d * cd) / ch);
    let m = Math.floor((t - d * cd - h * ch) / cm);
    let s = Math.floor(t - d * cd - h * ch - m * cm);
    const pad = (n) => (n < 10 ? `0${n}` : n);
    if (s === 60) {
      m += 1;
      s = 0;
    }
    if (m === 60) {
      h += 1;
      m = 0;
    }
    if (h === 24) {
      d += 1;
      h = 0;
    }
    return `${pad(d)} days \n${pad(h)} hours \n${pad(m)} minutes \n${pad(s)} seconds`;
  };
};
