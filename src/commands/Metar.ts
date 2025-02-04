import { Category, NotBot } from "@discordx/utilities";
import { AutocompleteInteraction, CommandInteraction, Formatters, MessageEmbed } from "discord.js";
import { Client, Discord, Guard, Slash, SlashOption } from "discordx";
import { injectable } from "tsyringe";

import { RequiredBotPerms } from "../guards/RequiredBotPerms.js";
import { AirportManager } from "../model/framework/manager/AirportManager.js";
import { AvwxManager } from "../model/framework/manager/AvwxManager.js";
import logger from "../utils/LoggerFactory.js";
import { InteractionUtils } from "../utils/Utils.js";

@Discord()
@Category("Advisory")
@injectable()
export class Metar {
    public constructor(private _avwxManager: AvwxManager) {}

    @Slash("metar", {
        description: "Gives you the latest METAR for the chosen airport"
    })
    @Guard(
        NotBot,
        RequiredBotPerms({
            textChannel: ["EMBED_LINKS"]
        })
    )
    public async metar(
        @SlashOption("icao", {
            autocomplete: (interaction: AutocompleteInteraction) => InteractionUtils.search(interaction, AirportManager),
            description: "What ICAO would you like the bot to give METAR for?",
            type: "STRING",
            required: true
        })
        icao: string,
        @SlashOption("raw-only", {
            description: "Gives you only the raw METAR for the chosen airport",
            required: false
        })
        rawOnlyData: boolean,
        interaction: CommandInteraction,
        client: Client
    ): Promise<void> {
        await interaction.deferReply();
        icao = icao.toUpperCase();
        const metarEmbed = new MessageEmbed()
            .setTitle(`METAR: ${Formatters.inlineCode(icao)}`)
            .setColor("#0099ff")
            .setTimestamp();
        try {
            const { raw, readable } = await this._avwxManager.getMetar(icao);
            if (rawOnlyData) {
                metarEmbed.setDescription(Formatters.codeBlock(raw));
            } else {
                metarEmbed.addFields(
                    {
                        name: "Raw Report",
                        value: Formatters.codeBlock(raw)
                    },
                    {
                        name: "Readable Report",
                        value: readable
                    }
                );
            }
        } catch (err) {
            logger.error(`[${client.shard.ids}] ${err}`);
            metarEmbed.setColor("#ff0000").setDescription(`${interaction.member}, ${err.message}`);
        }
        metarEmbed.setFooter({
            text: `${client.user.username} • This is not a source for official briefing • Please use the appropriate forums • Source: AVWX`
        });
        return InteractionUtils.replyOrFollowUp(interaction, {
            embeds: [metarEmbed]
        });
    }
}
