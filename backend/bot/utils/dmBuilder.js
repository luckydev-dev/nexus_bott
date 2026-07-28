// nexus bot
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

  const rowComponents = [
    new ButtonBuilder()
      .setCustomId(`dm_btn_simple_${sessionId}`)
      .setLabel('Simple')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`dm_btn_embed_${sessionId}`)
      .setLabel('Embed')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`dm_btn_cancel_${sessionId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
  ];

  const msgEmojiObj = getCustomEmojiObject('nexus_message');
  const prefixEmojiObj = getCustomEmojiObject('nexus_prefix');
  const crossEmojiObj = getCustomEmojiObject('nexus_cross');

  if (msgEmojiObj) rowComponents[0].setEmoji(msgEmojiObj);
  if (prefixEmojiObj) rowComponents[1].setEmoji(prefixEmojiObj);
  if (crossEmojiObj) rowComponents[2].setEmoji(crossEmojiObj);

  const row = new ActionRowBuilder().addComponents(rowComponents);

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

  const selectMenuOptions = [
    {
      label: 'Edit Title',
      value: 'title',
      description: 'Set custom title for the embed'
    },
    {
      label: 'Edit Description',
      value: 'description',
      description: 'Set message body description'
    },
    {
      label: 'Edit Color',
      value: 'color',
      description: 'Set hex color code (e.g. #3B82F6)'
    },
    {
      label: 'Edit Thumbnail',
      value: 'thumbnail',
      description: 'Set thumbnail image URL'
    },
    {
      label: 'Edit Banner Image',
      value: 'image',
      description: 'Set banner image URL'
    },
    {
      label: 'Edit Footer',
      value: 'footer',
      description: 'Set footer text'
    }
  ];

  const infoEmojiObj = getCustomEmojiObject('nexus_info');
  const msgEmojiObj = getCustomEmojiObject('nexus_message');
  const settingsEmojiObj = getCustomEmojiObject('nexus_settings') || getCustomEmojiObject('nexus_prefix');
  const linkEmojiObj = getCustomEmojiObject('nexus_link');

  if (infoEmojiObj) selectMenuOptions[0].emoji = infoEmojiObj;
  if (msgEmojiObj) selectMenuOptions[1].emoji = msgEmojiObj;
  if (settingsEmojiObj) selectMenuOptions[2].emoji = settingsEmojiObj;
  if (linkEmojiObj) selectMenuOptions[3].emoji = linkEmojiObj;
  if (linkEmojiObj) selectMenuOptions[4].emoji = linkEmojiObj;
  if (infoEmojiObj) selectMenuOptions[5].emoji = infoEmojiObj;

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`dm_select_field_${sessionId}`)
    .setPlaceholder('Select field to edit...')
    .addOptions(selectMenuOptions);

  const rowSelect = new ActionRowBuilder().addComponents(selectMenu);

  const btnSend = new ButtonBuilder()
    .setCustomId(`dm_btn_send_embed_${sessionId}`)
    .setLabel('Send DM')
    .setStyle(ButtonStyle.Success);

  const btnCancel = new ButtonBuilder()
    .setCustomId(`dm_btn_cancel_${sessionId}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Danger);

  const tickEmojiObj = getCustomEmojiObject('nexus_tick');
  const crossEmojiObj = getCustomEmojiObject('nexus_cross');

  if (tickEmojiObj) btnSend.setEmoji(tickEmojiObj);
  if (crossEmojiObj) btnCancel.setEmoji(crossEmojiObj);

  const rowButtons = new ActionRowBuilder().addComponents(btnSend, btnCancel);

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
