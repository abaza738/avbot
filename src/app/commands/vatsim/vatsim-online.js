const Discord = require('discord.js');
const { Command } = require('discord.js-commando');
const logger = require('../../utils/Logger');
const Vatsim = require('../../utils/Vatsim');

module.exports = class VatsimOnlineCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'vatsim-online',
      group: 'vatsim',
      memberName: 'vatsim-online',
      aliases: ['vo', 'vatsimonline'],
      description: 'Gives you the information for all ATCs which match the given partial callsign on the VATSIM network',
      examples: ['vatsim-online <partial_icao_code>'],
      args: [
        {
          key: 'partialCallSign',
          prompt: 'What partial call sign would you like the bot to give information for?',
          type: 'string',
          parse: (val) => val.toUpperCase()
        }
      ]
    });
  }

  async run(msg, { partialCallSign }) {
    const vatsimEmbed = new Discord.MessageEmbed()
      .setTitle(`${partialCallSign.toUpperCase()}`)
      .setColor('#0099ff')
      .setFooter(`${this.client.user.username} • Source: VATSIM API`)
      .setTimestamp();

    try {
      const { atcList } = await Vatsim.getPartialAtcClientInfo(partialCallSign);

      vatsimEmbed.setTitle(`VATSIM : ${partialCallSign}`);

      atcList.forEach((atc) => {
        vatsimEmbed.addField(`${atc.callSign}`, `VID: ${atc.vid}, Frequency: ${atc.frequency}`);
      });
    } catch (error) {
      logger.error(`[${this.client.shard.ids}] ${error}`);
      vatsimEmbed.setColor('#ff0000').setDescription(`${msg.author}, ${error.message}`);
    }

    return msg.embed(vatsimEmbed);
  }
};
