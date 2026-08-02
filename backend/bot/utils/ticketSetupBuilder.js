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
import { resolveEmojiObject } from './statusEmojis.js';

const activeTicketSetupSessions = new Map();

/**
 * Default ticket panel configuration
 */
export function createTicketSetupSession({ userId, guildId, initialData = null }) {
  const sessionId = `tkt_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const session = {
    sessionId,
    userId,
    guildId,
    counter: initialData?.counter || 1,
    panelData: {
      title: initialData?.title || '🎫 Nexus Support Ticket Panel',
      description: initialData?.description || 'Need assistance? Select a button below to open a direct support request with our server administration team.',
      color: initialData?.color || '#5865F2',
      thumbnail: initialData?.thumbnail || '',
      footer: initialData?.footer || 'NexusBot Support Automation System',
      welcomeMessage: initialData?.welcomeMessage || 'Welcome {user}! Thank you for contacting support. Our staff team has been notified. Please describe your inquiry in detail.',
      categoryId: initialData?.categoryId || '',
      buttons: initialData?.buttons || [
        {
          id: 'btn_default_1',
          label: 'General Support',
          categoryName: 'General Support',
          emoji: 'nexus_ticket',
          style: 'Primary'
        },
        {
          id: 'btn_default_2',
          label: 'Billing Support',
          categoryName: 'Billing Support',
          emoji: 'nexus_createticket',
          style: 'Success'
        }
      ]
    }
  };

  activeTicketSetupSessions.set(sessionId, session);
  return sessionId;
}

export function getTicketSetupSession(sessionId) {
  return activeTicketSetupSessions.get(sessionId);
}

export function deleteTicketSetupSession(sessionId) {
  activeTicketSetupSessions.delete(sessionId);
}

/**
 * Builds the interactive setup message with live embed preview, field selector, and control buttons.
 */
export function getTicketSetupBuilderViewAndComponents(sessionId, guild) {
  const session = getTicketSetupSession(sessionId);
  if (!session) return null;

  const { panelData } = session;

  // 1. Build Preview Embed
  const previewEmbed = new EmbedBuilder()
    .setColor(panelData.color && /^#[0-9A-F]{6}$/i.test(panelData.color) ? panelData.color : '#5865F2');

  if (panelData.title && panelData.title.trim()) {
    previewEmbed.setTitle(panelData.title.trim());
  } else {
    previewEmbed.setTitle('🎫 Support Ticket Panel');
  }

  if (panelData.description && panelData.description.trim()) {
    previewEmbed.setDescription(panelData.description.trim());
  }

  if (panelData.thumbnail && panelData.thumbnail.trim().startsWith('http')) {
    try {
      previewEmbed.setThumbnail(panelData.thumbnail.trim());
    } catch (e) {
      // ignore
    }
  } else if (guild) {
    const icon = guild.iconURL({ dynamic: true });
    if (icon) previewEmbed.setThumbnail(icon);
  }

  if (panelData.footer && panelData.footer.trim()) {
    previewEmbed.setFooter({ text: panelData.footer.trim() });
  }
  previewEmbed.setTimestamp();

  // Add field summary of buttons & welcome message
  const buttonSummary = panelData.buttons.length > 0
    ? panelData.buttons.map((b, i) => `${i + 1}. **${b.label}** (Category: \`${b.categoryName || 'Default'}\`)`).join('\n')
    : '*No custom buttons added yet*';

  previewEmbed.addFields(
    { name: '📋 Configured Ticket Buttons', value: buttonSummary, inline: false },
    { name: '💬 Ticket Welcome Message', value: `\`\`\`${panelData.welcomeMessage || 'Default welcome message'}\`\`\``, inline: false }
  );

  // 2. Select Menu to pick embed field to edit
  const fieldSelectMenu = new StringSelectMenuBuilder()
    .setCustomId(`tkt_select_field_${sessionId}`)
    .setPlaceholder('Select embed property to edit...')
    .addOptions([
      {
        label: 'Edit Title',
        value: 'title',
        description: 'Set custom title for the ticket panel embed',
        emoji: getCustomEmojiObject('nexus_info') || { name: '📝' }
      },
      {
        label: 'Edit Description',
        value: 'description',
        description: 'Set ticket panel body text',
        emoji: getCustomEmojiObject('nexus_message') || { name: '💬' }
      },
      {
        label: 'Edit Accent Color',
        value: 'color',
        description: 'Set hex color code (e.g. #5865F2)',
        emoji: getCustomEmojiObject('nexus_settings') || { name: '🎨' }
      },
      {
        label: 'Edit Welcome Message',
        value: 'welcomeMessage',
        description: 'Set message sent inside newly opened ticket channels',
        emoji: getCustomEmojiObject('nexus_createticket') || { name: '✉️' }
      },
      {
        label: 'Edit Thumbnail URL',
        value: 'thumbnail',
        description: 'Set custom thumbnail image URL',
        emoji: getCustomEmojiObject('nexus_link') || { name: '🖼️' }
      },
      {
        label: 'Edit Footer',
        value: 'footer',
        description: 'Set footer text for the embed',
        emoji: getCustomEmojiObject('nexus_info') || { name: '📑' }
      }
    ]);

  const rowFieldSelect = new ActionRowBuilder().addComponents(fieldSelectMenu);

  // 3. Action Buttons Row 1 (Add Button, Edit Welcome, Remove Button)
  const rowButtons1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tkt_btn_add_${sessionId}`)
      .setLabel('Add Ticket Button')
      .setEmoji(getCustomEmojiObject('nexus_ticket') || { name: '➕' })
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`tkt_btn_welcome_${sessionId}`)
      .setLabel('Edit Welcome Msg')
      .setEmoji(getCustomEmojiObject('nexus_createticket') || { name: '💬' })
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`tkt_btn_clear_btns_${sessionId}`)
      .setLabel('Reset Buttons')
      .setEmoji(getCustomEmojiObject('nexus_cross') || { name: '🗑️' })
      .setStyle(ButtonStyle.Secondary)
  );

  // 4. Action Buttons Row 2 (Target Channel / Category Select, Deploy, Cancel)
  const categorySelectMenu = new StringSelectMenuBuilder()
    .setCustomId(`tkt_select_category_${sessionId}`)
    .setPlaceholder('Select Discord Category for ticket channels...');

  // Get categories from guild
  const categories = guild ? Array.from(guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).values()) : [];
  if (categories.length > 0) {
    categorySelectMenu.addOptions(
      categories.slice(0, 25).map(cat => ({
        label: cat.name,
        value: cat.id,
        description: `Route created ticket channels into ${cat.name}`,
        default: panelData.categoryId === cat.id,
        emoji: { name: '📁' }
      }))
    );
  } else {
    categorySelectMenu.addOptions([
      {
        label: 'Default Server Category',
        value: 'default',
        description: 'Auto-create tickets at top of server channel list',
        emoji: { name: '📁' }
      }
    ]);
  }

  const rowCategorySelect = new ActionRowBuilder().addComponents(categorySelectMenu);

  const rowButtons2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tkt_btn_deploy_${sessionId}`)
      .setLabel('Deploy Ticket Panel')
      .setEmoji(getCustomEmojiObject('nexus_tick') || { name: '🚀' })
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`tkt_btn_cancel_${sessionId}`)
      .setLabel('Cancel')
      .setEmoji(getCustomEmojiObject('nexus_cross') || { name: '❌' })
      .setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [previewEmbed],
    components: [rowFieldSelect, rowButtons1, rowCategorySelect, rowButtons2]
  };
}

/**
 * Creates modal for editing single string fields (Title, Color, Welcome, etc.)
 */
export function createTicketFieldModal(sessionId, fieldName, currentValue = '') {
  const modal = new ModalBuilder()
    .setCustomId(`tkt_modal_field_${fieldName}_${sessionId}`)
    .setTitle(`Edit Ticket Panel ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`);

  const fieldLabels = {
    title: 'Panel Title',
    description: 'Panel Description',
    color: 'Hex Color Code (e.g. #5865F2)',
    welcomeMessage: 'Ticket Welcome Message (Use {user} for mention)',
    thumbnail: 'Thumbnail Image URL',
    footer: 'Footer Text'
  };

  const isParagraph = ['description', 'welcomeMessage'].includes(fieldName);

  const input = new TextInputBuilder()
    .setCustomId('field_value')
    .setLabel(fieldLabels[fieldName] || fieldName)
    .setStyle(isParagraph ? TextInputStyle.Paragraph : TextInputStyle.Short)
    .setValue(currentValue || '')
    .setRequired(fieldName === 'title' || fieldName === 'description')
    .setMaxLength(isParagraph ? 1000 : 256);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

/**
 * Creates modal for adding a new ticket action button
 */
export function createAddTicketButtonModal(sessionId) {
  const modal = new ModalBuilder()
    .setCustomId(`tkt_modal_add_button_${sessionId}`)
    .setTitle('Add Ticket Category Button');

  const nameInput = new TextInputBuilder()
    .setCustomId('button_label')
    .setLabel('Button Label (e.g., General Support)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Technical Support')
    .setRequired(true)
    .setMaxLength(80);

  const catInput = new TextInputBuilder()
    .setCustomId('category_name')
    .setLabel('Category Name (e.g., Support Queries)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. TECH-HELP')
    .setRequired(true)
    .setMaxLength(80);

  const emojiInput = new TextInputBuilder()
    .setCustomId('button_emoji')
    .setLabel('Emoji Name/Icon (nexus_ticket, nexus_createticket)')
    .setStyle(TextInputStyle.Short)
    .setValue('nexus_ticket')
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(catInput),
    new ActionRowBuilder().addComponents(emojiInput)
  );

  return modal;
}
