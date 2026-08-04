/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';
import { ensureGuildStorage, getGuildSettings } from '../storage.js';
import { getCustomEmoji } from '../utils/customEmojis.js';

export async function handleGuildCreate(guild) {
  try {
    ensureGuildStorage(guild.id);
    const settings = getGuildSettings(guild.id);
    const prefix = settings.prefix || '!';
    const supportUrl = 'https://discord.gg/Dz3Rgc7FKn';
    const websiteUrl = 'https://nexusbot.dev';

    const arrowIcon = getCustomEmoji('nexus_arrowright') || '->';
    const ownerIcon = getCustomEmoji('nexus_owner') || '[Owner]';

    // 1. Channel Welcome Embed
    const channelEmbed = new EmbedBuilder()
      .setTitle('Thanks for adding me!')
      .setColor('#3B82F6')
      .setDescription(
        `${arrowIcon} **Prefix For This Server is** \`${prefix}\`\n` +
        `${arrowIcon} **Get Started with** \`${prefix}help\`\n` +
        `${arrowIcon} For detailed guides, FAQ & information, visit our **[Support Server](${supportUrl})**`
      )
      .setFooter({ text: 'Powered by NexusBot™' });

    if (guild.iconURL()) {
      channelEmbed.setThumbnail(guild.iconURL({ dynamic: true, size: 256 }));
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Support')
        .setURL(supportUrl)
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('Website')
        .setURL(websiteUrl)
        .setStyle(ButtonStyle.Link)
    );

    // Find system channel or first text channel where bot can send messages
    let targetChannel = guild.systemChannel;
    if (!targetChannel || !targetChannel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages)) {
      targetChannel = guild.channels.cache.find(c => 
        c.type === ChannelType.GuildText && 
        c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages)
      );
    }

    if (targetChannel) {
      await targetChannel.send({ embeds: [channelEmbed], components: [row] }).catch(() => {});
    }

    // 2. DM Server Owner
    const owner = await guild.fetchOwner().catch(() => null);
    if (owner) {
      const dmEmbed = new EmbedBuilder()
        .setTitle(`${guild.name}`)
        .setColor('#3B82F6')
        .setDescription(
          `${ownerIcon} **Thanks for adding me.**\n\n` +
          `${arrowIcon} **My default prefix is** \`${prefix}\`\n\n` +
          `${arrowIcon} Use the \`${prefix}help\` command to see a list of commands\n\n` +
          `${arrowIcon} For detailed guides, FAQ and information, visit our **[Support Server](${supportUrl})**`
        )
        .setFooter({ text: 'Powered by NexusBot™' });

      if (guild.iconURL()) {
        dmEmbed.setThumbnail(guild.iconURL({ dynamic: true, size: 256 }));
      }

      await owner.send({ embeds: [dmEmbed], components: [row] }).catch(() => {});
    }
  } catch (err) {
    console.error('[NexusBot guildCreate Event Error]', err);
  }
}
