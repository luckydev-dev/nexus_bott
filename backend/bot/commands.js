/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const commands = [
  {
    name: 'extract',
    description: 'Extracts all custom emojis from the server formatted as name = <:name:id>.'
  },
  {
    name: 'help',
    description: 'Displays the security modules help guide.',
    options: [
      {
        name: 'command',
        description: 'Specific command or module to query (e.g. mute, ban, automod)',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'lock',
    description: 'Locks down the current channel, preventing members from sending messages.',
    options: [
      {
        name: 'channel',
        description: 'The channel to lock (defaults to current)',
        type: 7, // CHANNEL
        required: false
      },
      {
        name: 'reason',
        description: 'The reason for the channel lock',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'unlock',
    description: 'Unlocks the specified channel, restoring normal member messaging privileges.',
    options: [
      {
        name: 'channel',
        description: 'The channel to unlock (defaults to current)',
        type: 7, // CHANNEL
        required: false
      },
      {
        name: 'reason',
        description: 'The reason for unlocking the channel',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'lockall',
    description: 'Locks all text channels across the server for @everyone.',
    options: [
      {
        name: 'reason',
        description: 'Reason for locking all channels',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'unlockall',
    description: 'Unlocks all text channels across the server for @everyone.',
    options: [
      {
        name: 'reason',
        description: 'Reason for unlocking all channels',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'ban',
    description: 'Permanently bans a malicious user from the server.',
    options: [
      {
        name: 'user',
        description: 'The user to ban',
        type: 6, // USER
        required: true
      },
      {
        name: 'reason',
        description: 'Reason for the ban',
        type: 3, // STRING
        required: false
      },
      {
        name: 'delete_messages',
        description: 'Number of days of message history to delete (0-7)',
        type: 4, // INTEGER
        required: false
      }
    ]
  },
  {
    name: 'tempban',
    description: 'Temporarily bans a member from the server for a specific duration.',
    options: [
      {
        name: 'user',
        description: 'The user to temporarily ban',
        type: 6, // USER
        required: true
      },
      {
        name: 'duration',
        description: 'Duration (e.g. 1h, 12h, 7d)',
        type: 3, // STRING
        required: true
      },
      {
        name: 'reason',
        description: 'Reason for the temporary ban',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'unban',
    description: 'Revokes an active ban and permits a user to rejoin.',
    options: [
      {
        name: 'user_id',
        description: 'The ID of the banned user',
        type: 3, // STRING
        required: true
      },
      {
        name: 'reason',
        description: 'The reason for unbanning',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'kick',
    description: 'Kicks a member from the server under audit guidelines.',
    options: [
      {
        name: 'user',
        description: 'The user to kick',
        type: 6, // USER
        required: true
      },
      {
        name: 'reason',
        description: 'The reason for kicking the member',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'mute',
    description: 'Restricts messaging privileges by placing a user in timeout.',
    options: [
      {
        name: 'user',
        description: 'The user to mute',
        type: 6, // USER
        required: true
      },
      {
        name: 'duration',
        description: 'Duration of the mute (e.g. 10m, 1h, 1d)',
        type: 3, // STRING
        required: true
      },
      {
        name: 'reason',
        description: 'Reason for the mute penalty',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'unmute',
    description: 'Removes active timeout restrictions from a member.',
    options: [
      {
        name: 'user',
        description: 'The user to unmute',
        type: 6, // USER
        required: true
      },
      {
        name: 'reason',
        description: 'Reason for lifting the mute',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'warn',
    description: 'Formally issues a warn ticket on a member and records it.',
    options: [
      {
        name: 'user',
        description: 'The user to warn',
        type: 6, // USER
        required: true
      },
      {
        name: 'reason',
        description: 'The specific rule violation or reason',
        type: 3, // STRING
        required: true
      }
    ]
  },
  {
    name: 'warnings',
    description: 'Retrieves infraction history and warning logs for a user.',
    options: [
      {
        name: 'user',
        description: 'The user to query (default is self)',
        type: 6, // USER
        required: false
      }
    ]
  },
  {
    name: 'clearwarns',
    description: 'Clears warning infraction logs for a member.',
    options: [
      {
        name: 'user',
        description: 'The user to clear warnings of',
        type: 6, // USER
        required: true
      },
      {
        name: 'case_id',
        description: 'Specific warning case ID (optional)',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'purge',
    description: 'Mass deletes up to 100 recent messages in the channel.',
    options: [
      {
        name: 'amount',
        description: 'Number of messages to delete (1-100)',
        type: 4, // INTEGER
        required: true
      },
      {
        name: 'filter',
        description: 'Type of messages to target (e.g. bots, links, files, user)',
        type: 3, // STRING
        required: false,
        choices: [
          { name: 'Bots Only', value: 'bots' },
          { name: 'Links Only', value: 'links' },
          { name: 'Embeds Only', value: 'embeds' },
          { name: 'Attachments Only', value: 'files' }
        ]
      }
    ]
  },
  {
    name: 'slowmode',
    description: 'Adjusts the message rate delay (slowmode) for a channel.',
    options: [
      {
        name: 'delay',
        description: 'Delay in seconds (0 to disable, up to 21600)',
        type: 4, // INTEGER
        required: true
      },
      {
        name: 'channel',
        description: 'The target channel (defaults to current)',
        type: 7, // CHANNEL
        required: false
      }
    ]
  },
  {
    name: 'softban',
    description: 'Bans and immediately unbans a user to wipe their message history.',
    options: [
      {
        name: 'user',
        description: 'The user to softban',
        type: 6, // USER
        required: true
      },
      {
        name: 'reason',
        description: 'Reason for the softban',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'strip',
    description: 'Emergency admin strip: immediate removal of all admin roles from a compromised user.',
    options: [
      {
        name: 'user',
        description: 'The admin user to demote',
        type: 6, // USER
        required: true
      },
      {
        name: 'reason',
        description: 'Reason for emergency stripping',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'quarantine',
    description: 'Toggles quarantine/isolation status on a suspicious member.',
    options: [
      {
        name: 'user',
        description: 'The user to quarantine',
        type: 6, // USER
        required: true
      },
      {
        name: 'active',
        description: 'Whether to activate quarantine',
        type: 5, // BOOLEAN
        required: true
      }
    ]
  },
  {
    name: 'modlogs',
    description: 'Searches the audit database for actions executed by a specific moderator.',
    options: [
      {
        name: 'moderator',
        description: 'The moderator to query',
        type: 6, // USER
        required: true
      }
    ]
  },
  {
    name: 'whitelist',
    description: 'Adds/removes a role or member from bypass filters.',
    options: [
      {
        name: 'action',
        description: 'Add or remove from whitelist',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Add Bypass', value: 'add' },
          { name: 'Remove Bypass', value: 'remove' }
        ]
      },
      {
        name: 'role',
        description: 'Role to whitelist',
        type: 8, // ROLE
        required: false
      },
      {
        name: 'user',
        description: 'User to whitelist',
        type: 6, // USER
        required: false
      }
    ]
  },
  {
    name: 'embed',
    description: 'Create and send a custom embed message to a channel.'
  },
  {
    name: 'dm',
    description: 'Send a direct message from the bot to a specific user.',
    options: [
      {
        name: 'user',
        description: 'The user to send the DM to',
        type: 6, // USER
        required: true
      }
    ]
  },
  {
    name: 'dmroll',
    description: 'DM a random server member (with optional role filter) to run a lottery/draw.',
    options: [
      {
        name: 'message',
        description: 'The message content or description',
        type: 3, // STRING
        required: true
      },
      {
        name: 'role',
        description: 'Filter random select to only members with this role',
        type: 8, // ROLE
        required: false
      },
      {
        name: 'title',
        description: 'Custom title for the DM embed (optional)',
        type: 3, // STRING
        required: false
      },
      {
        name: 'color',
        description: 'Custom hex color e.g. #3B82F6 (optional)',
        type: 3, // STRING
        required: false
      },
      {
        name: 'thumbnail',
        description: 'Direct image URL for thumbnail (optional)',
        type: 3, // STRING
        required: false
      },
      {
        name: 'image',
        description: 'Direct image URL for large banner image (optional)',
        type: 3, // STRING
        required: false
      },
      {
        name: 'footer',
        description: 'Custom footer text (optional)',
        type: 3, // STRING
        required: false
      },
      {
        name: 'embed',
        description: 'Whether to send as rich customizable embed (default: true)',
        type: 5, // BOOLEAN
        required: false
      }
    ]
  },
  {
    name: 'dmglobal',
    description: 'Send a DM to all members of the server (or filter by role).',
    options: [
      {
        name: 'role',
        description: 'Send only to members with this role (optional)',
        type: 8, // ROLE
        required: false
      }
    ]
  },
  {
    name: 'activity',
    description: 'Activity logging configurations.',
    options: [
      {
        name: 'log',
        description: 'Configure activity log channel',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'channel',
            description: 'The channel to send general activity logs to',
            type: 7, // CHANNEL
            required: true
          }
        ]
      }
    ]
  },
  {
    name: 'logs',
    description: 'Sets the general Discord activity log channel for server events.',
    options: [
      {
        name: 'log',
        description: 'Configure activity log channel',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'channel',
            description: 'The channel to send general activity logs to',
            type: 7, // CHANNEL
            required: true
          }
        ]
      }
    ]
  },
  {
    name: 'automod',
    description: 'Sets the AutoMod security log channel and settings.',
    options: [
      {
        name: 'log',
        description: 'Configure AutoMod log channel',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'channel',
            description: 'The channel to send AutoMod security logs to',
            type: 7, // CHANNEL
            required: true
          }
        ]
      },
      {
        name: 'status',
        description: 'View AutoMod shield configuration status',
        type: 1 // SUB_COMMAND
      },
      {
        name: 'toggle',
        description: 'Enable or disable AutoMod guard',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'enabled',
            description: 'True to enable, False to disable',
            type: 5, // BOOLEAN
            required: true
          }
        ]
      }
    ]
  },
  {
    name: 'antinuke',
    description: 'Sets the AntiNuke protection log channel and settings.',
    options: [
      {
        name: 'log',
        description: 'Configure AntiNuke log channel',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'channel',
            description: 'The channel to send AntiNuke protection logs to',
            type: 7, // CHANNEL
            required: true
          }
        ]
      },
      {
        name: 'status',
        description: 'View AntiNuke guard status',
        type: 1 // SUB_COMMAND
      },
      {
        name: 'toggle',
        description: 'Enable or disable AntiNuke guard',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'enabled',
            description: 'True to enable, False to disable',
            type: 5, // BOOLEAN
            required: true
          }
        ]
      }
    ]
  },
  {
    name: 'antiraid',
    description: 'Sets the AntiRaid defense log channel and settings.',
    options: [
      {
        name: 'log',
        description: 'Configure AntiRaid log channel',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'channel',
            description: 'The channel to send AntiRaid defense logs to',
            type: 7, // CHANNEL
            required: true
          }
        ]
      },
      {
        name: 'status',
        description: 'View AntiRaid defense status',
        type: 1 // SUB_COMMAND
      }
    ]
  },
  {
    name: 'nick',
    description: 'Changes or resets the nickname of a server member.',
    options: [
      {
        name: 'user',
        description: 'The target user',
        type: 6, // USER
        required: true
      },
      {
        name: 'nickname',
        description: 'New nickname (leave blank to reset)',
        type: 3, // STRING
        required: false
      },
      {
        name: 'reason',
        description: 'Reason for changing nickname',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'role',
    description: 'Grants or revokes a role from a target member.',
    options: [
      {
        name: 'add',
        description: 'Add a role to a member',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'user',
            description: 'The user to give the role to',
            type: 6, // USER
            required: true
          },
          {
            name: 'role',
            description: 'The role to assign',
            type: 8, // ROLE
            required: true
          },
          {
            name: 'reason',
            description: 'Reason for assigning the role',
            type: 3, // STRING
            required: false
          }
        ]
      },
      {
        name: 'remove',
        description: 'Remove a role from a member',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'user',
            description: 'The user to remove the role from',
            type: 6, // USER
            required: true
          },
          {
            name: 'role',
            description: 'The role to remove',
            type: 8, // ROLE
            required: true
          },
          {
            name: 'reason',
            description: 'Reason for removing the role',
            type: 3, // STRING
            required: false
          }
        ]
      }
    ]
  },
  {
    name: 'userinfo',
    description: 'Inspects a user moderation profile, roles, joined date, and security record.',
    options: [
      {
        name: 'user',
        description: 'Target member to inspect (defaults to self)',
        type: 6, // USER
        required: false
      }
    ]
  },
  {
    name: 'avatar',
    description: 'Displays a user avatar and download links.',
    options: [
      {
        name: 'user',
        description: 'Target member to display avatar for (defaults to self)',
        type: 6, // USER
        required: false
      }
    ]
  },
  {
    name: 'serverinfo',
    description: 'Displays server security overview, member metrics, and verification status.'
  },
  {
    name: 'servericon',
    description: 'Displays the server icon and download links.'
  },
  {
    name: 'massrole',
    description: 'Bulk assigns or removes a role for all humans or all bots.',
    options: [
      {
        name: 'action',
        description: 'Add or remove role',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Add Role', value: 'add' },
          { name: 'Remove Role', value: 'remove' }
        ]
      },
      {
        name: 'target',
        description: 'Target group',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Humans Only', value: 'humans' },
          { name: 'Bots Only', value: 'bots' },
          { name: 'All Members', value: 'all' }
        ]
      },
      {
        name: 'role',
        description: 'The role to assign or remove',
        type: 8, // ROLE
        required: true
      },
      {
        name: 'reason',
        description: 'Reason for mass role adjustment',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'voicemute',
    description: 'Server mutes a member in voice channels.',
    options: [
      {
        name: 'user',
        description: 'The user to voice mute',
        type: 6, // USER
        required: true
      },
      {
        name: 'reason',
        description: 'Reason for voice mute',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'voiceunmute',
    description: 'Server unmutes a member in voice channels.',
    options: [
      {
        name: 'user',
        description: 'The user to voice unmute',
        type: 6, // USER
        required: true
      },
      {
        name: 'reason',
        description: 'Reason for lifting voice mute',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'voicekick',
    description: 'Disconnects a user from their active voice channel.',
    options: [
      {
        name: 'user',
        description: 'The user to disconnect',
        type: 6, // USER
        required: true
      },
      {
        name: 'reason',
        description: 'Reason for voice kick',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'deafen',
    description: 'Server deafens a member in voice channels.',
    options: [
      {
        name: 'user',
        description: 'The user to deafen',
        type: 6, // USER
        required: true
      },
      {
        name: 'reason',
        description: 'Reason for deafening',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'undeafen',
    description: 'Server undeafens a member in voice channels.',
    options: [
      {
        name: 'user',
        description: 'The user to undeafen',
        type: 6, // USER
        required: true
      },
      {
        name: 'reason',
        description: 'Reason for undeafening',
        type: 3, // STRING
        required: false
      }
    ]
  },
  {
    name: 'extractembed',
    description: 'Extracts embeds from a replied message or target message ID into raw JSON.',
    options: [
      {
        name: 'message_id',
        description: 'Optional ID of the message containing embeds to extract',
        type: 3, // STRING
        required: false
      }
    ]
  }
];
