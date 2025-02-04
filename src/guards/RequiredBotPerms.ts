import type { PermissionsType } from "@discordx/utilities";
import type { CommandInteraction } from "discord.js";
import { Formatters, GuildChannel, GuildMember, MessageEmbed } from "discord.js";
import type { Client, GuardFunction, Next } from "discordx";

import logger from "../utils/LoggerFactory.js";
import { InteractionUtils } from "../utils/Utils.js";

/**
 * THis ensures the bot has the required permissions to execute the command
 * @param {{textChannel: PermissionsType, voice?: {perms: PermissionsType, enforce: boolean}}} permissions
 * @returns {GuardFunction<CommandInteraction>}
 * @constructor
 */
export function RequiredBotPerms(permissions: {
    textChannel: PermissionsType;
    /**
     * Add voice permissions, setting this will do 3 things: 1. it will ensure the member calling this is in a voice channel. 2: it will enforce the bot has the correct permissions supplied in the voice channel the member is in. 3: it will ensure the voice channel is joinable and not full
     */
    voice?: PermissionsType;
}): GuardFunction<CommandInteraction> {
    return async function (arg: CommandInteraction, client: Client, next: Next): Promise<unknown> {
        const channel = arg.channel;
        if (!(channel instanceof GuildChannel) || !arg.inGuild()) {
            return next();
        }
        const guild = arg.guild;
        if (channel.isText()) {
            if (!channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
                logger.error(`[${client.shard.ids}] cannot send guard warning message to this channel`, arg);
                return;
            }
        }
        const perms = typeof permissions.textChannel === "function" ? await permissions.textChannel(arg) : permissions.textChannel;
        if (!channel.permissionsFor(guild.me).has(perms)) {
            return InteractionUtils.replyOrFollowUp(
                arg,
                `AvBot doesn't have the required permissions to perform the action in this channel. Please enable "${perms.join(", ")}" under channel permissions for AvBot`
            );
        }

        if (permissions.voice) {
            const voicePerms = typeof permissions.voice === "function" ? await permissions.voice(arg) : permissions.voice;
            const member = arg.member;
            if (member instanceof GuildMember) {
                const voiceChannel = member?.voice?.channel;
                if (voiceChannel) {
                    if (!voiceChannel.permissionsFor(guild.me).has(voicePerms)) {
                        return InteractionUtils.replyOrFollowUp(
                            arg,
                            `AvBot doesn't have permissions to connect and/or to speak in your voice channel. Please enable "${voicePerms.join(", ")}" under channel permissions for AvBot.`
                        );
                    }
                    if (!voiceChannel.joinable) {
                        const embed = new MessageEmbed()
                            .setTitle(Formatters.inlineCode(arg.commandName))
                            .setColor("#ff0000")
                            .setDescription(`${member}, AvBot is unable to join the voice channel as it is already full.`)
                            .setFooter({
                                text: `${client.user.username} • This is not a source for official briefing • Please use the appropriate forums`
                            })
                            .setTimestamp();
                        return InteractionUtils.replyOrFollowUp(arg, {
                            embeds: [embed]
                        });
                    }
                } else {
                    const embed = new MessageEmbed()
                        .setTitle(Formatters.inlineCode(arg.commandName))
                        .setColor("#ff0000")
                        .setDescription(`${member}, you need to join a voice channel first.`)
                        .setFooter({
                            text: `${client.user.username} • This is not a source for official briefing • Please use the appropriate forums`
                        })
                        .setTimestamp();
                    return InteractionUtils.replyOrFollowUp(arg, {
                        embeds: [embed]
                    });
                }
            }
        }
        return next();
    };
}
