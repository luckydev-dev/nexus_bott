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
      title: '',
      description: '',
      color: '#3B82F6',
      thumbnail: '',
      image: '',
      footer: ''
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

  const msgIcon = getCustomEmoji('nexus_message');
  const userIcon = getCustomEmoji('nexus_user');

  const embed = new EmbedBuilder()
    .setTitle(`${msgIcon} Direct Message`)
    .setColor('#3B82F6')
    .setDescription('Select message format below:')
    .addFields({
      name: `${userIcon} Recipient`,
      value: targetText,
      inline: false
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`dm_btn_simple_${sessionId}`)
      .setLabel('Simple')
      .setEmoji(getCustomEmojiObject('nexus_message') || { name: '💬' })
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`dm_btn_embed_${sessionId}`)
      .setLabel('Embed')
      .setEmoji(getCustomEmojiObject('nexus_prefix') || { name: '📜' })
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`dm_btn_cancel_${sessionId}`)
      .setLabel('Cancel')
      .setEmoji(getCustomEmojiObject('nexus_cross') || { name: '❌' })
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

  const previewEmbed = new EmbedBuilder()
    .setColor(embedData.color && /^#[0-9A-F]{6}$/i.test(embedData.color) ? embedData.color : '#3B82F6');

  if (embedData.title && embedData.title.trim()) {
    previewEmbed.setTitle(embedData.title.trim());
  }

  if (embedData.description && embedData.description.trim()) {
    previewEmbed.setDescription(embedData.description.trim());
  } else if (!embedData.title || !embedData.title.trim()) {
    previewEmbed.setDescription('*(Embed preview — select an option below to add content)*');
  }

  if (embedData.thumbnail && embedData.thumbnail.trim().startsWith('http')) {
    try {
      previewEmbed.setThumbnail(embedData.thumbnail.trim());
    } catch (e) {
      // ignore invalid URL format
    }
  }

  if (embedData.image && embedData.image.trim().startsWith('http')) {
    try {
      previewEmbed.setImage(embedData.image.trim());
    } catch (e) {
      // ignore invalid URL format
    }
  }

  if (embedData.footer && embedData.footer.trim()) {
    previewEmbed.setFooter({ text: embedData.footer.trim() });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`dm_select_field_${sessionId}`)
    .setPlaceholder('Select field to edit...')
    .addOptions([
      {
        label: 'Edit Title',
        value: 'title',
        description: 'Set custom title for the embed',
        emoji: getCustomEmojiObject('nexus_info') || { name: '📝' }
      },
      {
        label: 'Edit Description',
        value: 'description',
        description: 'Set message body description',
        emoji: getCustomEmojiObject('nexus_message') || { name: '💬' }
      },
      {
        label: 'Edit Color',
        value: 'color',
        description: 'Set hex color code (e.g. #3B82F6)',
        emoji: getCustomEmojiObject('nexus_prefix') || getCustomEmojiObject('nexus_settings') || { name: '🎨' }
      },
      {
        label: 'Edit Thumbnail',
        value: 'thumbnail',
        description: 'Set thumbnail image URL',
        emoji: getCustomEmojiObject('nexus_link') || { name: '🖼️' }
      },
      {
        label: 'Edit Banner Image',
        value: 'image',
        description: 'Set banner image URL',
        emoji: getCustomEmojiObject('nexus_link') || { name: '🖼️' }
      },
      {
        label: 'Edit Footer',
        value: 'footer',
        description: 'Set footer text',
        emoji: getCustomEmojiObject('nexus_info') || { name: '📑' }
      }
    ]);

  const rowSelect = new ActionRowBuilder().addComponents(selectMenu);

  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`dm_btn_send_embed_${sessionId}`)
      .setLabel('Send DM')
      .setEmoji(getCustomEmojiObject('nexus_tick') || { name: '✅' })
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`dm_btn_cancel_${sessionId}`)
      .setLabel('Cancel')
      .setEmoji(getCustomEmojiObject('nexus_cross') || { name: '❌' })
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
