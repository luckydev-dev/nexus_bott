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
  ChannelSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { getCustomEmoji, getCustomEmojiObject } from './customEmojis.js';

const activeChannelEmbedSessions = new Map();

/**
 * Creates a new channel embed session.
 */
export function createChannelEmbedSession({ userId, guildId }) {
  const sessionId = `chan_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const session = {
    sessionId,
    userId,
    guildId,
    embedData: {
      title: '',
      description: '',
      color: '#3B82F6',
      thumbnail: '',
      image: '',
      footer: ''
    }
  };
  activeChannelEmbedSessions.set(sessionId, session);
  return sessionId;
}

export function getChannelEmbedSession(sessionId) {
  return activeChannelEmbedSessions.get(sessionId);
}

export function deleteChannelEmbedSession(sessionId) {
  activeChannelEmbedSessions.delete(sessionId);
}

/**
 * Interactive Embed Builder view for channels with dropdown field selector and Send/Cancel buttons.
 */
export function getChannelEmbedBuilderViewAndComponents(sessionId) {
  const session = getChannelEmbedSession(sessionId);
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
    .setCustomId(`chan_select_field_${sessionId}`)
    .setPlaceholder('Select field to edit...')
    .addOptions(selectMenuOptions);

  const rowSelect = new ActionRowBuilder().addComponents(selectMenu);

  const btnSend = new ButtonBuilder()
    .setCustomId(`chan_btn_send_${sessionId}`)
    .setLabel('Send')
    .setStyle(ButtonStyle.Success);

  const btnCancel = new ButtonBuilder()
    .setCustomId(`chan_btn_cancel_${sessionId}`)
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
 * Creates view asking "where to send embed" with channel select dropdown.
 */
export function getChannelSelectViewAndComponents(sessionId) {
  const session = getChannelEmbedSession(sessionId);
  if (!session) return null;

  const prefixIcon = getCustomEmoji('nexus_prefix');

  const embed = new EmbedBuilder()
    .setTitle(`${prefixIcon} Select Channel`)
    .setColor('#3B82F6')
    .setDescription('Select the channel where you want to send this embed:');

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`chan_select_channel_${sessionId}`)
    .setPlaceholder('Select a channel...')
    .setChannelTypes(
      ChannelType.GuildText,
      ChannelType.GuildAnnouncement
    );

  const rowSelect = new ActionRowBuilder().addComponents(channelSelect);

  const btnCancel = new ButtonBuilder()
    .setCustomId(`chan_btn_cancel_${sessionId}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Danger);

  const crossEmojiObj = getCustomEmojiObject('nexus_cross');
  if (crossEmojiObj) btnCancel.setEmoji(crossEmojiObj);

  const rowButtons = new ActionRowBuilder().addComponents(btnCancel);

  return { embeds: [embed], components: [rowSelect, rowButtons] };
}

/**
 * Creates modal for editing a single embed field.
 */
export function createChannelEmbedFieldModal(sessionId, fieldName) {
  const session = getChannelEmbedSession(sessionId);
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
    .setCustomId(`chan_modal_field_${fieldName}_${sessionId}`)
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
