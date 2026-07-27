/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { getCustomEmoji, getCustomEmojiObject } from './customEmojis.js';
import { statusEmoji } from './statusEmojis.js';

const activeDmSessions = new Map();

/**
 * Creates a new DM session.
 */
export function createDmSession({ userId, guildId, commandName, targetUser, targetRole }) {
  const sessionId = `${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const session = {
    sessionId,
    userId,
    guildId,
    commandName,
    targetUser, // User object or null
    targetRole, // Role object or null
    embedData: {
      title: 'Direct Message',
      description: '',
      color: '#3B82F6',
      thumbnail: '',
      image: '',
      footer: 'NexusBot • Direct Message'
    }
  };
  activeDmSessions.set(sessionId, session);
  return sessionId;
}

export function getDmSession(sessionId) {
  return activeDmSessions.get(sessionId);
}

export function deleteDmSession(sessionId) {
  activeDmSessions.delete(sessionId);
}

/**
 * Initial ephemeral embed view with 3 buttons: Simple, Embed, Cancel
 */
export function getInitialDmDispatchEmbedAndComponents(sessionId) {
  const session = getDmSession(sessionId);
  const targetText = session?.targetUser 
    ? `<@${session.targetUser.id}> (**${session.targetUser.tag || session.targetUser.username}**)`
    : (session?.targetRole ? `<@&${session.targetRole.id}>` : 'Entire Server');

  const msgIcon = getCustomEmoji('nexus_message') || '✉️';
  const userIcon = getCustomEmoji('nexus_user') || '👤';
  const infoIcon = getCustomEmoji('nexus_info') || 'ℹ️';

  const embed = new EmbedBuilder()
    .setTitle(`${msgIcon} Direct Message Dispatcher`)
    .setColor('#3B82F6')
    .setDescription(
      `${userIcon} **Target Recipient**: ${targetText}\n\n` +
      `${infoIcon} **Select Message Type**:\n` +
      `Choose how you would like to compose and dispatch your message below.`
    )
    .setFooter({ text: 'NexusBot • DM Dispatcher' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`dm_btn_simple_${sessionId}`)
      .setLabel('Simple')
      .setEmoji(getCustomEmojiObject('nexus_message') || { name: '💬' })
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`dm_btn_embed_${sessionId}`)
      .setLabel('Embed')
      .setEmoji(getCustomEmojiObject('nexus_custom') || getCustomEmojiObject('nexus_settings') || { name: '🎨' })
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`dm_btn_cancel_${sessionId}`)
      .setLabel('Cancel')
      .setEmoji(getCustomEmojiObject('nexus_error') || { name: '❌' })
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Custom Embed Builder view with dropdown select menu and Send/Cancel buttons.
 */
export function getEmbedBuilderViewAndComponents(sessionId) {
  const session = getDmSession(sessionId);
  if (!session) return null;

  const { embedData } = session;
  const customIcon = getCustomEmoji('nexus_custom') || getCustomEmoji('nexus_settings') || '🎨';
  const infoIcon = getCustomEmoji('nexus_info') || '📝';
  const msgIcon = getCustomEmoji('nexus_message') || '💬';
  const linkIcon = getCustomEmoji('nexus_link') || '🖼️';

  const previewEmbed = new EmbedBuilder()
    .setTitle(`${customIcon} Custom Embed Builder Preview`)
    .setColor(embedData.color || '#3B82F6')
    .setDescription(
      `${infoIcon} **Title**: ${embedData.title || '*Not set*'}\n` +
      `${msgIcon} **Description/Message**: ${embedData.description || '*Not set (Select "Edit Message / Description" from dropdown below)*'}\n` +
      `${customIcon} **Hex Color**: \`${embedData.color || '#3B82F6'}\`\n` +
      `${linkIcon} **Thumbnail URL**: ${embedData.thumbnail ? `\`${embedData.thumbnail}\`` : '*None*'}\n` +
      `${linkIcon} **Banner Image URL**: ${embedData.image ? `\`${embedData.image}\`` : '*None*'}\n` +
      `${infoIcon} **Footer Text**: ${embedData.footer ? `\`${embedData.footer}\`` : '*None*'}`
    )
    .setFooter({ text: 'Select an option below to customize embed fields instantly' });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`dm_select_field_${sessionId}`)
    .setPlaceholder('Click to edit embed fields...')
    .addOptions([
      {
        label: 'Edit Title',
        value: 'title',
        description: 'Set custom title for the embed',
        emoji: getCustomEmojiObject('nexus_info') || { name: '📝' }
      },
      {
        label: 'Edit Message / Description',
        value: 'description',
        description: 'Set main message body content',
        emoji: getCustomEmojiObject('nexus_message') || { name: '💬' }
      },
      {
        label: 'Edit Color (Hex)',
        value: 'color',
        description: 'Change embed accent hex color (e.g. #3B82F6)',
        emoji: getCustomEmojiObject('nexus_settings') || { name: '🎨' }
      },
      {
        label: 'Edit Thumbnail URL',
        value: 'thumbnail',
        description: 'Set small icon URL on the top right',
        emoji: getCustomEmojiObject('nexus_link') || { name: '🖼️' }
      },
      {
        label: 'Edit Banner Image URL',
        value: 'image',
        description: 'Set large banner image URL at the bottom',
        emoji: getCustomEmojiObject('nexus_link') || { name: '🖼️' }
      },
      {
        label: 'Edit Footer Text',
        value: 'footer',
        description: 'Set custom footer text at the bottom',
        emoji: getCustomEmojiObject('nexus_info') || { name: '📑' }
      }
    ]);

  const rowSelect = new ActionRowBuilder().addComponents(selectMenu);

  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`dm_btn_send_embed_${sessionId}`)
      .setLabel('Send DM')
      .setEmoji(getCustomEmojiObject('nexus_success') || { name: '🚀' })
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`dm_btn_cancel_${sessionId}`)
      .setLabel('Cancel')
      .setEmoji(getCustomEmojiObject('nexus_error') || { name: '❌' })
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [previewEmbed], components: [rowSelect, rowButtons] };
}

/**
 * Creates modal for editing a single embed field.
 */
export function createEmbedFieldModal(sessionId, fieldName) {
  const session = getDmSession(sessionId);
  const currentValue = session?.embedData?.[fieldName] || '';

  const fieldLabels = {
    title: 'Embed Title',
    description: 'Message / Description Content',
    color: 'Hex Color (e.g. #3B82F6)',
    thumbnail: 'Thumbnail Image URL',
    image: 'Banner Image URL',
    footer: 'Footer Text'
  };

  const modal = new ModalBuilder()
    .setCustomId(`dm_modal_field_${fieldName}_${sessionId}`)
    .setTitle(`Edit ${fieldLabels[fieldName] || fieldName}`);

  const input = new TextInputBuilder()
    .setCustomId('field_value')
    .setLabel(fieldLabels[fieldName] || fieldName)
    .setStyle(fieldName === 'description' ? TextInputStyle.Paragraph : TextInputStyle.Short)
    .setValue(currentValue)
    .setRequired(false)
    .setPlaceholder(`Enter ${fieldLabels[fieldName]}...`);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

/**
 * Creates modal for simple text message input.
 */
export function createSimpleMessageModal(sessionId) {
  const modal = new ModalBuilder()
    .setCustomId(`dm_modal_simple_${sessionId}`)
    .setTitle('Compose Simple DM');

  const input = new TextInputBuilder()
    .setCustomId('simple_message')
    .setLabel('Message Content')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setPlaceholder('Type your direct message content here...');

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}
