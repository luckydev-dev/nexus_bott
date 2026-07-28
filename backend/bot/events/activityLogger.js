/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logActivity } from '../utils/logger.js';

export async function handleChannelUpdate(oldChannel, newChannel) {
  if (!newChannel.guild) return;
  const changes = [];
  if (oldChannel.name !== newChannel.name) {
    changes.push({ name: 'Name Changed', value: `\`${oldChannel.name}\` ➔ \`${newChannel.name}\``, inline: true });
  }
  if (oldChannel.topic !== newChannel.topic) {
    changes.push({ name: 'Topic Changed', value: `\`${oldChannel.topic || 'None'}\` ➔ \`${newChannel.topic || 'None'}\``, inline: false });
  }
  if (changes.length > 0) {
    const isCategory = newChannel.type === 4;
    await logActivity(
      newChannel.guild,
      isCategory ? 'Category Updated' : 'Channel Updated',
      `${isCategory ? 'Category' : 'Channel'} <#${newChannel.id}> (\`${newChannel.name}\`) was modified.`,
      changes,
      0x3B82F6
    );
  }
}

export async function handleRoleUpdate(oldRole, newRole) {
  if (!newRole.guild) return;
  const changes = [];
  if (oldRole.name !== newRole.name) {
    changes.push({ name: 'Role Name', value: `\`${oldRole.name}\` ➔ \`${newRole.name}\``, inline: true });
  }
  if (oldRole.color !== newRole.color) {
    changes.push({ name: 'Role Color', value: `\`#${oldRole.color.toString(16)}\` ➔ \`#${newRole.color.toString(16)}\``, inline: true });
  }
  if (changes.length > 0) {
    await logActivity(
      newRole.guild,
      'Role Updated',
      `Role <@&${newRole.id}> (\`${newRole.name}\`) was updated.`,
      changes,
      0x8B5CF6
    );
  }
}

export async function handleGuildMemberUpdate(oldMember, newMember) {
  if (!newMember.guild) return;
  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;

  const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
  const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

  if (addedRoles.size > 0 || removedRoles.size > 0) {
    const fields = [];
    if (addedRoles.size > 0) {
      fields.push({ name: 'Added Roles', value: addedRoles.map(r => `<@&${r.id}>`).join(', '), inline: true });
    }
    if (removedRoles.size > 0) {
      fields.push({ name: 'Removed Roles', value: removedRoles.map(r => `<@&${r.id}>`).join(', '), inline: true });
    }
    await logActivity(
      newMember.guild,
      'Member Roles Updated',
      `Member <@${newMember.user.id}> (\`${newMember.user.tag}\`) roles were modified.`,
      fields,
      0x10B981,
      newMember.user.displayAvatarURL({ dynamic: true })
    );
  }
}

export async function handleMessageDelete(message) {
  if (!message.guild || message.author?.bot) return;
  await logActivity(
    message.guild,
    'Message Deleted',
    `Message by <@${message.author?.id || 'unknown'}> deleted in <#${message.channel.id}>.`,
    [
      { name: 'Author', value: `<@${message.author?.id}> (\`${message.author?.tag}\`)`, inline: true },
      { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
      { name: 'Content', value: `\`\`\`${message.content ? message.content.slice(0, 800) : '[No Text Content / Attachment]'}\`\`\``, inline: false }
    ],
    0xEF4444
  );
}

export async function handleMessageUpdate(oldMessage, newMessage) {
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;

  await logActivity(
    newMessage.guild,
    'Message Edited',
    `Message by <@${newMessage.author?.id}> edited in <#${newMessage.channel.id}>.`,
    [
      { name: 'Before', value: `\`\`\`${oldMessage.content ? oldMessage.content.slice(0, 400) : '[Empty]'}\`\`\``, inline: false },
      { name: 'After', value: `\`\`\`${newMessage.content ? newMessage.content.slice(0, 400) : '[Empty]'}\`\`\``, inline: false }
    ],
    0xF59E0B
  );
}
