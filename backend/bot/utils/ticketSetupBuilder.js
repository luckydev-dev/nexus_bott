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
  RoleSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { getCustomEmojiObject } from './customEmojis.js';
import { resolveEmojiObject } from './statusEmojis.js';

const activeTicketSetupSessions = new Map();

/**
 * Creates or resets a ticket setup session.
 */
export function createTicketSetupSession({ userId, guildId, initialData = null }) {
  const sessionId = `tkt_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const session = {
    sessionId,
    userId,
    guildId,
    step: 1, // 1: Embed Builder, 2: Add Components, 3: Support Settings, 4: Target Channel & Deploy
    pendingComponent: null, // Temporary storage during modal -> category workflow
    panelData: {
      title: initialData?.panelTitle || 'Support Ticket Panel',
      description: initialData?.description || 'Select an option below to open a support ticket with our team.',
      color: initialData?.color || '#5865F2',
      thumbnail: initialData?.thumbnail || '',
      footer: initialData?.footer || 'Support Ticket System',
      welcomeMessage: initialData?.welcomeMessage || 'Welcome {user}! Thank you for contacting support. Our team has been notified.',
      logChannelId: initialData?.logChannelId || '',
      staffRoleId: initialData?.staffRoleId || '',
      transcriptChannelId: initialData?.transcriptChannelId || '',
      transcriptType: initialData?.transcriptType || 'text',
      componentType: initialData?.componentType || 'buttons', // 'buttons' or 'menu'
      buttons: initialData?.buttons || [],
      menuOptions: initialData?.menuOptions || [],
      targetChannelId: ''
    }
  };

  activeTicketSetupSessions.set(sessionId, session);
  return sessionId;
}

export function getTicketSetupSession(sessionId, fallbackGuildId = null, fallbackUserId = null) {
  if (sessionId && activeTicketSetupSessions.has(sessionId)) {
    return activeTicketSetupSessions.get(sessionId);
  }

  if (sessionId && typeof sessionId === 'string' && sessionId.startsWith('tkt_')) {
    const parts = sessionId.split('_');
    const userId = fallbackUserId || (parts.length >= 2 ? parts[1] : 'unknown');
    const session = {
      sessionId,
      userId,
      guildId: fallbackGuildId || '',
      step: 1,
      pendingComponent: null,
      panelData: {
        title: 'Support Ticket Panel',
        description: 'Select an option below to open a support ticket with our team.',
        color: '#5865F2',
        thumbnail: '',
        footer: 'Support Ticket System',
        welcomeMessage: 'Welcome {user}! Thank you for contacting support. Our team has been notified.',
        logChannelId: '',
        staffRoleId: '',
        transcriptChannelId: '',
        transcriptType: 'text',
        componentType: 'buttons',
        buttons: [],
        menuOptions: [],
        targetChannelId: ''
      }
    };
    activeTicketSetupSessions.set(sessionId, session);
    return session;
  }

  return null;
}

export function deleteTicketSetupSession(sessionId) {
  activeTicketSetupSessions.delete(sessionId);
}

/**
 * Main View Renderer for Step-by-Step Ticket Setup Wizard
 */
export function getTicketSetupBuilderViewAndComponents(sessionId, guild) {
  const session = getTicketSetupSession(sessionId);
  if (!session) return null;

  const { step, panelData } = session;

  if (step === 1) {
    return buildStep1EmbedBuilderView(sessionId, session, guild);
  } else if (step === 2) {
    return buildStep2ComponentsView(sessionId, session, guild);
  } else if (step === 3) {
    return buildStep3SettingsView(sessionId, session, guild);
  } else if (step === 4) {
    return buildStep4DeployView(sessionId, session, guild);
  }

  return buildStep1EmbedBuilderView(sessionId, session, guild);
}

/**
 * STEP 1: Embed Builder (Live Preview & Field Select Menu)
 */
function buildStep1EmbedBuilderView(sessionId, session, guild) {
  const { panelData } = session;

  const previewEmbed = new EmbedBuilder()
    .setColor(panelData.color && /^#[0-9A-F]{6}$/i.test(panelData.color) ? panelData.color : '#5865F2');

  if (panelData.title && panelData.title.trim()) {
    previewEmbed.setTitle(panelData.title.trim());
  } else {
    previewEmbed.setTitle('Support Ticket Panel');
  }

  if (panelData.description && panelData.description.trim()) {
    previewEmbed.setDescription(panelData.description.trim());
  } else {
    previewEmbed.setDescription('Click a button below to open a ticket.');
  }

  if (panelData.thumbnail && panelData.thumbnail.trim().startsWith('http')) {
    try {
      previewEmbed.setThumbnail(panelData.thumbnail.trim());
    } catch (e) {
      // ignore
    }
  } else if (guild?.iconURL({ dynamic: true })) {
    previewEmbed.setThumbnail(guild.iconURL({ dynamic: true }));
  }

  if (panelData.footer && panelData.footer.trim()) {
    previewEmbed.setFooter({ text: panelData.footer.trim() });
  }

  previewEmbed.setTimestamp();

  // Select menu for embed properties
  const fieldSelectMenu = new StringSelectMenuBuilder()
    .setCustomId(`tkt_select_field_${sessionId}`)
    .setPlaceholder('Select embed property to customize...')
    .addOptions([
      {
        label: 'Edit Title',
        value: 'title',
        description: 'Set header title for ticket panel'
      },
      {
        label: 'Edit Description',
        value: 'description',
        description: 'Set body text for ticket panel'
      },
      {
        label: 'Edit Accent Color',
        value: 'color',
        description: 'Set hex color code (e.g. #5865F2)'
      },
      {
        label: 'Edit Thumbnail URL',
        value: 'thumbnail',
        description: 'Set panel image thumbnail URL'
      },
      {
        label: 'Edit Footer Text',
        value: 'footer',
        description: 'Set panel footer line'
      }
    ]);

  const rowFieldSelect = new ActionRowBuilder().addComponents(fieldSelectMenu);

  const rowControls = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tkt_btn_step1_next_${sessionId}`)
      .setLabel('Continue to Add Buttons/Menu')
      .setEmoji(getCustomEmojiObject('nexus_tick') || undefined)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`tkt_btn_cancel_${sessionId}`)
      .setLabel('Cancel Setup')
      .setEmoji(getCustomEmojiObject('nexus_cross') || undefined)
      .setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [previewEmbed],
    components: [rowFieldSelect, rowControls]
  };
}

/**
 * STEP 2: Add Components (Buttons or Dropdown Menu Options)
 */
function buildStep2ComponentsView(sessionId, session, guild) {
  const { panelData } = session;

  const previewEmbed = new EmbedBuilder()
    .setColor(panelData.color && /^#[0-9A-F]{6}$/i.test(panelData.color) ? panelData.color : '#5865F2')
    .setTitle(panelData.title || 'Support Ticket Panel')
    .setDescription(panelData.description || 'Select an option below to open a ticket.')
    .setTimestamp();

  if (panelData.thumbnail) previewEmbed.setThumbnail(panelData.thumbnail);
  if (panelData.footer) previewEmbed.setFooter({ text: panelData.footer });

  // Summary of added components
  const menuSummary = panelData.menuOptions && panelData.menuOptions.length > 0
    ? panelData.menuOptions.map((m, i) => `${i + 1}. Option: **${m.label}** -> Category: \`${m.categoryName || 'Default'}\``).join('\n')
    : '*No dropdown options added*';

  previewEmbed.addFields(
    { name: 'Configured Ticket Categories', value: menuSummary, inline: false }
  );

  const totalCategories = (panelData.menuOptions?.length || 0);

  const rowComponents = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tkt_btn_add_menu_${sessionId}`)
      .setLabel('Add Category')
      .setEmoji(getCustomEmojiObject('nexus_createticket') || undefined)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`tkt_btn_step2_back_${sessionId}`)
      .setLabel('Back')
      .setEmoji(getCustomEmojiObject('nexus_arrowleft') || undefined)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`tkt_btn_cancel_${sessionId}`)
      .setLabel('Cancel')
      .setEmoji(getCustomEmojiObject('nexus_cross') || undefined)
      .setStyle(ButtonStyle.Danger)
  );

  const components = [rowComponents];

  if (totalCategories > 0) {
    const rowNext = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tkt_btn_step2_next_${sessionId}`)
        .setLabel('Continue to Settings')
        .setEmoji(getCustomEmojiObject('nexus_arrowright') || undefined)
        .setStyle(ButtonStyle.Success)
    );
    components.push(rowNext);
  }

  return {
    embeds: [previewEmbed],
    components
  };
}

/**
 * STEP 3: Support Settings (Welcome Message, Log Channel, Staff Roles)
 */
function buildStep3SettingsView(sessionId, session, guild) {
  const { panelData } = session;
  const components = [];

  // If actively configuring a specific field, show a clean, simplified menu-specific screen
  if (session.activeConfigField === 'log_channel') {
    const logEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Configure Log Channel')
      .setDescription('Please select the text channel from the menu below to receive ticket audit logs.');

    const logSelect = new ChannelSelectMenuBuilder()
      .setCustomId(`tkt_select_log_channel_${sessionId}`)
      .setPlaceholder('Select log channel for ticket events...')
      .setChannelTypes(ChannelType.GuildText);

    components.push(new ActionRowBuilder().addComponents(logSelect));

    const rowControls = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tkt_btn_step3_cancel_config_${sessionId}`)
        .setLabel('Go Back')
        .setEmoji(getCustomEmojiObject('nexus_arrowleft') || undefined)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tkt_btn_cancel_${sessionId}`)
        .setLabel('Cancel Setup')
        .setEmoji(getCustomEmojiObject('nexus_cross') || undefined)
        .setStyle(ButtonStyle.Danger)
    );
    components.push(rowControls);

    return {
      embeds: [logEmbed],
      components
    };
  }

  if (session.activeConfigField === 'transcript_channel') {
    const transEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Configure Transcript Channel')
      .setDescription('Please select the text channel from the menu below to receive deleted ticket transcripts.');

    const transSelect = new ChannelSelectMenuBuilder()
      .setCustomId(`tkt_select_transcript_channel_${sessionId}`)
      .setPlaceholder('Select transcript channel for deleted tickets...')
      .setChannelTypes(ChannelType.GuildText);

    components.push(new ActionRowBuilder().addComponents(transSelect));

    const rowControls = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tkt_btn_step3_cancel_config_${sessionId}`)
        .setLabel('Go Back')
        .setEmoji(getCustomEmojiObject('nexus_arrowleft') || undefined)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tkt_btn_cancel_${sessionId}`)
        .setLabel('Cancel Setup')
        .setEmoji(getCustomEmojiObject('nexus_cross') || undefined)
        .setStyle(ButtonStyle.Danger)
    );
    components.push(rowControls);

    return {
      embeds: [transEmbed],
      components
    };
  }

  if (session.activeConfigField === 'transcript_type') {
    const typeEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Configure Transcript Format')
      .setDescription('Please select the format of your ticket transcripts when tickets are archived or deleted.');

    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId(`tkt_select_transcript_type_${sessionId}`)
      .setPlaceholder('Select transcript format...')
      .addOptions([
        {
          label: 'Plain Text File (.txt)',
          value: 'text',
          description: 'Generates a clean text file containing all message logs'
        },
        {
          label: 'HTML File (.html)',
          value: 'html',
          description: 'Generates a fully-styled HTML page mimicking a Discord channel'
        }
      ]);

    components.push(new ActionRowBuilder().addComponents(typeSelect));

    const rowControls = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tkt_btn_step3_cancel_config_${sessionId}`)
        .setLabel('Go Back')
        .setEmoji(getCustomEmojiObject('nexus_arrowleft') || undefined)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tkt_btn_cancel_${sessionId}`)
        .setLabel('Cancel Setup')
        .setEmoji(getCustomEmojiObject('nexus_cross') || undefined)
        .setStyle(ButtonStyle.Danger)
    );
    components.push(rowControls);

    return {
      embeds: [typeEmbed],
      components
    };
  }

  if (session.activeConfigField === 'staff_role') {
    const roleEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Configure Staff Support Role')
      .setDescription('Please select the role from the menu below that is authorized to manage and claim support tickets.');

    const roleSelect = new RoleSelectMenuBuilder()
      .setCustomId(`tkt_select_staff_role_${sessionId}`)
      .setPlaceholder('Select staff support role to manage tickets...');

    components.push(new ActionRowBuilder().addComponents(roleSelect));

    const rowControls = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tkt_btn_step3_cancel_config_${sessionId}`)
        .setLabel('Go Back')
        .setEmoji(getCustomEmojiObject('nexus_arrowleft') || undefined)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tkt_btn_cancel_${sessionId}`)
        .setLabel('Cancel Setup')
        .setEmoji(getCustomEmojiObject('nexus_cross') || undefined)
        .setStyle(ButtonStyle.Danger)
    );
    components.push(rowControls);

    return {
      embeds: [roleEmbed],
      components
    };
  }

  const settingsEmbed = new EmbedBuilder()
    .setColor(panelData.color && /^#[0-9A-F]{6}$/i.test(panelData.color) ? panelData.color : '#5865F2')
    .setTitle('Support Ticket Configuration & Automation Settings')
    .setDescription('Customize welcome messages, audit logs, and support team role permissions below.')
    .addFields(
      {
        name: 'Ticket Welcome Message',
        value: `\`\`\`${panelData.welcomeMessage || 'Welcome {user}! Thank you for contacting support.'}\`\`\``,
        inline: false
      },
      {
        name: 'Log Channel',
        value: panelData.logChannelId ? `<#${panelData.logChannelId}>` : '*Not configured*',
        inline: true
      },
      {
        name: 'Transcript Channel',
        value: panelData.transcriptChannelId ? `<#${panelData.transcriptChannelId}>` : '*Not configured*',
        inline: true
      },
      {
        name: 'Staff Support Role',
        value: panelData.staffRoleId ? `<@&${panelData.staffRoleId}>` : '*Not configured*',
        inline: true
      },
      {
        name: 'Transcript Format',
        value: `\`${panelData.transcriptType === 'html' ? 'HTML (.html)' : 'Plain Text (.txt)'}\``,
        inline: true
      }
    )
    .setTimestamp();

  const configSelectMenu = new StringSelectMenuBuilder()
    .setCustomId(`tkt_step3_config_select_${sessionId}`)
    .setPlaceholder('Select a setting to configure...')
    .addOptions([
      {
        label: 'Edit Welcome Message',
        value: 'welcome_msg',
        description: 'Set custom greeting message shown in opened tickets'
      },
      {
        label: 'Configure Log Channel',
        value: 'log_channel',
        description: 'Set audit log channel for ticket actions'
      },
      {
        label: 'Configure Transcript Channel',
        value: 'transcript_channel',
        description: 'Set channel for deleted ticket transcripts'
      },
      {
        label: 'Configure Transcript Format',
        value: 'transcript_type',
        description: 'Set format for deleted ticket transcripts (Text vs HTML)'
      },
      {
        label: 'Configure Staff Support Role',
        value: 'staff_role',
        description: 'Set role authorized to claim/manage tickets'
      }
    ]);

  components.push(new ActionRowBuilder().addComponents(configSelectMenu));

  const rowControls = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tkt_btn_step3_next_${sessionId}`)
      .setLabel('Continue to Target Channel')
      .setEmoji(getCustomEmojiObject('nexus_tick') || undefined)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`tkt_btn_step3_back_${sessionId}`)
      .setLabel('Back to Components')
      .setEmoji(getCustomEmojiObject('nexus_arrowleft') || undefined)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`tkt_btn_cancel_${sessionId}`)
      .setLabel('Cancel Setup')
      .setEmoji(getCustomEmojiObject('nexus_cross') || undefined)
      .setStyle(ButtonStyle.Danger)
  );
  components.push(rowControls);

  return {
    embeds: [settingsEmbed],
    components
  };
}

/**
 * STEP 4: Target Channel Selection & Deployment
 */
function buildStep4DeployView(sessionId, session, guild) {
  const { panelData } = session;

  const deployEmbed = new EmbedBuilder()
    .setColor(panelData.color && /^#[0-9A-F]{6}$/i.test(panelData.color) ? panelData.color : '#5865F2')
    .setTitle('Select Deployment Channel')
    .setDescription('Select the target channel where the interactive ticket panel should be sent.')
    .addFields(
      {
        name: 'Selected Target Channel',
        value: panelData.targetChannelId ? `<#${panelData.targetChannelId}>` : '*Please select a channel below*',
        inline: false
      },
      {
        name: 'Panel Summary',
        value: `Title: \`${panelData.title}\` | Components: \`${panelData.buttons.length} buttons, ${panelData.menuOptions.length} menu options\``,
        inline: false
      }
    )
    .setTimestamp();

  const rowChannelSelect = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(`tkt_select_deploy_channel_${sessionId}`)
      .setPlaceholder('Select channel to send ticket panel into...')
      .setChannelTypes(ChannelType.GuildText)
  );

  const rowControls = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tkt_btn_deploy_now_${sessionId}`)
      .setLabel('Send Ticket Panel')
      .setEmoji(getCustomEmojiObject('nexus_tick') || undefined)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`tkt_btn_step4_back_${sessionId}`)
      .setLabel('Back to Settings')
      .setEmoji(getCustomEmojiObject('nexus_arrowleft') || undefined)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`tkt_btn_cancel_${sessionId}`)
      .setLabel('Cancel Setup')
      .setEmoji(getCustomEmojiObject('nexus_cross') || undefined)
      .setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [deployEmbed],
    components: [rowChannelSelect, rowControls]
  };
}

/**
 * View when asking user to pick a category after modal submit
 */
export function buildCategorySelectForComponentView(sessionId, guild, componentLabel) {
  const session = getTicketSetupSession(sessionId);
  if (!session) return null;

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('Select Category Channel for Ticket Routing')
    .setDescription(`Select the Discord Category channel where ticket channels created via **"${componentLabel}"** should be placed.`)
    .setTimestamp();

  const categorySelectMenu = new StringSelectMenuBuilder()
    .setCustomId(`tkt_select_component_category_${sessionId}`)
    .setPlaceholder('Select category channel...');

  const categories = guild ? Array.from(guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).values()) : [];
  if (categories.length > 0) {
    categorySelectMenu.addOptions(
      categories.slice(0, 25).map(cat => ({
        label: cat.name,
        value: cat.id,
        description: `Route created ticket channels into ${cat.name}`
      }))
    );
  } else {
    categorySelectMenu.addOptions([
      {
        label: 'Default Category',
        value: 'default',
        description: 'Auto-create tickets at top of server channel list'
      }
    ]);
  }

  const row = new ActionRowBuilder().addComponents(categorySelectMenu);

  return {
    embeds: [embed],
    components: [row]
  };
}

/**
 * Modal for single string embed field customization
 */
export function createTicketFieldModal(sessionId, fieldName, currentValue = '') {
  const modal = new ModalBuilder()
    .setCustomId(`tkt_modal_field_${fieldName}_${sessionId}`)
    .setTitle(`Edit Ticket Panel ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`);

  const fieldLabels = {
    title: 'Panel Title',
    description: 'Panel Description',
    color: 'Hex Color Code (e.g. #5865F2)',
    welcomeMessage: 'Ticket Welcome Message (Use {user} for user mention)',
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
 * Modal for adding a ticket button
 */
export function createAddTicketButtonModal(sessionId) {
  const modal = new ModalBuilder()
    .setCustomId(`tkt_modal_add_button_${sessionId}`)
    .setTitle('Add Ticket Category Button');

  const labelInput = new TextInputBuilder()
    .setCustomId('button_label')
    .setLabel('Button Label (e.g., General Support)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Technical Support')
    .setRequired(true)
    .setMaxLength(80);

  const emojiInput = new TextInputBuilder()
    .setCustomId('button_emoji')
    .setLabel('Emoji Name (e.g. nexus_ticket)')
    .setStyle(TextInputStyle.Short)
    .setValue('nexus_ticket')
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(labelInput),
    new ActionRowBuilder().addComponents(emojiInput)
  );

  return modal;
}

/**
 * Modal for adding a select menu option
 */
export function createAddTicketMenuOptionModal(sessionId) {
  const modal = new ModalBuilder()
    .setCustomId(`tkt_modal_add_menu_option_${sessionId}`)
    .setTitle('Add Dropdown Select Menu Option');

  const labelInput = new TextInputBuilder()
    .setCustomId('option_label')
    .setLabel('Option Label (e.g., General Inquiry)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Report a Member')
    .setRequired(true)
    .setMaxLength(80);

  const descInput = new TextInputBuilder()
    .setCustomId('option_desc')
    .setLabel('Option Description')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Submit a confidential report to admins')
    .setRequired(false)
    .setMaxLength(100);

  const emojiInput = new TextInputBuilder()
    .setCustomId('option_emoji')
    .setLabel('Emoji Name (e.g. nexus_ticket)')
    .setStyle(TextInputStyle.Short)
    .setValue('nexus_ticket')
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(labelInput),
    new ActionRowBuilder().addComponents(descInput),
    new ActionRowBuilder().addComponents(emojiInput)
  );

  return modal;
}
