import { Category, NotBot } from "@discordx/utilities";
import { AutocompleteInteraction, CommandInteraction, Formatters, MessageEmbed } from "discord.js";
import { Client, Discord, Guard, Slash, SlashChoice, SlashOption } from "discordx";
import { injectable } from "tsyringe";

import { GuildOnly } from "../guards/GuildOnly.js";
import { RequiredBotPerms } from "../guards/RequiredBotPerms.js";
import { AirportManager } from "../model/framework/manager/AirportManager.js";
import { IvaoManager } from "../model/framework/manager/IvaoManager.js";
import type { IvaoAtc, IvaoPilot } from "../model/Typeings.js";
import { IvaoAtcRatingEnum, IvaoPilotRatingEnum } from "../model/Typeings.js";
import logger from "../utils/LoggerFactory.js";
import { InteractionUtils, ObjectUtil } from "../utils/Utils.js";

@Discord()
@Category("Flight Sim Network")
@injectable()
export class Ivao {
    public constructor(private _ivaoManager: IvaoManager, private _airportManager: AirportManager) {}

    @Slash("ivao", {
        description: "Gives you the information for the chosen call sign on the IVAO network"
    })
    @Guard(
        NotBot,
        RequiredBotPerms({
            textChannel: ["EMBED_LINKS"]
        }),
        GuildOnly
    )
    public async ivao(
        @SlashChoice("atc", "pilot")
        @SlashOption("type", {
            description: "What type of client would you like the bot to give information for?",
            type: "STRING",
            required: true
        })
        type: "atc" | "pilot",
        @SlashOption("call-sign", {
            description: "What call sign would you like the bot to give information for?",
            autocomplete: (interaction: AutocompleteInteraction) => InteractionUtils.search(interaction, IvaoManager),
            type: "STRING",
            required: true
        })
        callSign: string,
        interaction: CommandInteraction,
        client: Client
    ): Promise<void> {
        await interaction.deferReply();
        callSign = callSign.toUpperCase();

        const ivaoEmbed = new MessageEmbed()
            .setTitle(`IVAO: ${Formatters.inlineCode(callSign)}`)
            .setColor("#0099ff")
            .setFooter({
                text: `${client.user.username} • This is not a source for official briefing • Please use the appropriate forums • Source: IVAO API`
            })
            .setTimestamp();

        try {
            let ivaoClient = (await this._ivaoManager.getClientInfo(callSign, type)) as IvaoPilot | IvaoAtc;
            ivaoEmbed.setTitle(`IVAO: ${Formatters.inlineCode(callSign)} (open on Webeye)`);
            ivaoEmbed.addFields(
                {
                    name: "Call Sign",
                    value: ivaoClient.callsign,
                    inline: true
                },
                {
                    name: "VID",
                    value: ivaoClient.userId.toString(),
                    inline: true
                }
            );
            switch (type) {
                case "pilot":
                    ivaoClient = ivaoClient as IvaoPilot;
                    ivaoEmbed.setURL(`https://webeye.ivao.aero/?pilotId=${ivaoClient.id}`);
                    const departureAirport = await this._airportManager.getAirport(ivaoClient.flightPlan.departureId);
                    const arrivalAirport = await this._airportManager.getAirport(ivaoClient.flightPlan.arrivalId);
                    ivaoEmbed.addFields(
                        {
                            name: "Rating",
                            value: ivaoClient.rating ? IvaoPilotRatingEnum[ivaoClient.rating.toString()] : "Unknown",
                            inline: true
                        },
                        {
                            name: "Departure",
                            value: departureAirport.name,
                            inline: true
                        },
                        {
                            name: "Destination",
                            value: arrivalAirport.name,
                            inline: true
                        },
                        {
                            name: "Transponder",
                            value: ivaoClient.lastTrack.transponder.toString().padStart(4, "0"),
                            inline: true
                        },
                        {
                            name: "Latitude",
                            value: ivaoClient.lastTrack.latitude.toString(),
                            inline: true
                        },
                        {
                            name: "Longitude",
                            value: ivaoClient.lastTrack.longitude.toString(),
                            inline: true
                        },
                        {
                            name: "Altitude",
                            value: `${ivaoClient.lastTrack.altitude.toString()} ft`,
                            inline: true
                        },
                        {
                            name: "Ground Speed",
                            value: `${ivaoClient.lastTrack.groundSpeed.toString()} knots`,
                            inline: true
                        },
                        {
                            name: "Cruising Speed",
                            value: ivaoClient.flightPlan.speed.toString(),
                            inline: true
                        },
                        {
                            name: "Cruising Level",
                            value: ivaoClient.flightPlan.level,
                            inline: true
                        },
                        {
                            name: "Departure Time",
                            value: this.parseTime(ivaoClient.flightPlan.departureTime) + "Z",
                            inline: true
                        },
                        {
                            name: "EET",
                            value: this.parseTime(ivaoClient.flightPlan.eet),
                            inline: true
                        },
                        {
                            name: "Aircraft",
                            value: ivaoClient.flightPlan.aircraftId,
                            inline: true
                        },
                        {
                            name: "Route",
                            value: Formatters.codeBlock(ivaoClient.flightPlan.route),
                            inline: false
                        },
                        {
                            name: "Remarks",
                            value: Formatters.codeBlock(ivaoClient.flightPlan.remarks),
                            inline: false
                        }
                    );
                    break;
                case "atc":
                    ivaoClient = ivaoClient as IvaoAtc;
                    ivaoEmbed.setURL(`https://webeye.ivao.aero/?atcId=${ivaoClient.id}`);
                    ivaoEmbed.addFields(
                        {
                            name: "Rating",
                            value: ivaoClient.rating ? IvaoAtcRatingEnum[ivaoClient.rating.toString()] : "Unknown",
                            inline: true
                        },
                        {
                            name: "Position",
                            value: ivaoClient.atcSession.position,
                            inline: true
                        },
                        {
                            name: "Frequency",
                            value: ivaoClient.atcSession.frequency.toFixed(3).toString(),
                            inline: true
                        },
                        {
                            name: "ATIS Revision",
                            value: ivaoClient.atis.revision,
                            inline: true
                        },
                        {
                            name: "ATIS",
                            value: Formatters.codeBlock(ivaoClient.atis.lines.map((line) => line.trim()).join("\n")),
                            inline: false
                        }
                    );
                    break;
            }
        } catch (e) {
            logger.error(`[${client.shard.ids}] ${e}`);
            ivaoEmbed.setColor("#ff0000").setDescription(`${interaction.member}, ${e.message}`);
        }
        return InteractionUtils.replyOrFollowUp(interaction, {
            embeds: [ivaoEmbed]
        });
    }

    private parseTime(time: number): string {
        return ObjectUtil.dayJsAsUtc.utc().startOf("day").add(time, "seconds").format("HHmm");
    }
}
