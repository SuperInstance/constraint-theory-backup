/**
 * Slack Connector
 * 
 * Enterprise Slack integration for workflow automation:
 * - Send messages to channels and users
 * - Handle interactive components (buttons, menus)
 * - Webhook event handling
 * - OAuth2 authentication
 * - Rate limit handling
 * 
 * @module connectors/slack
 * @version 1.0.0
 */

import type { 
  Connector, 
  ConnectorConfig, 
  ConnectorInstance,
  OperationResult,
  HealthCheckResult,
  RateLimitConfig,
  RetryConfig
} from '../types/connectors';
import { HttpConnectorInstance, CircuitBreaker } from '../workflow/connectors';

// ============================================
// Types
// ============================================

/**
 * Slack connector configuration
 */
export interface SlackConfig extends ConnectorConfig {
  /** Bot token (xoxb-) */
  botToken?: string;
  /** App-level token (xapp-) */
  appToken?: string;
  /** Signing secret for webhook verification */
  signingSecret?: string;
  /** Default channel for messages */
  defaultChannel?: string;
  /** Bot name override */
  botName?: string;
  /** Bot icon emoji or URL */
  botIcon?: string;
  /** Enable message threading */
  threadingEnabled?: boolean;
  /** Reference to secret provider */
  secretProvider?: SecretProvider;
}

/**
 * Secret provider interface
 */
export interface SecretProvider {
  getSecret(key: string): Promise<string | undefined>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
}

/**
 * Slack message
 */
export interface SlackMessage {
  /** Channel ID or name */
  channel: string;
  /** Message text */
  text?: string;
  /** Blocks for rich formatting */
  blocks?: SlackBlock[];
  /** Attachments (legacy) */
  attachments?: SlackAttachment[];
  /** Thread timestamp for replies */
  threadTs?: string;
  /** Reply broadcast */
  replyBroadcast?: boolean;
  /** Unfurl links */
  unfurlLinks?: boolean;
  /** Unfurl media */
  unfurlMedia?: boolean;
  /** Icon emoji override */
  iconEmoji?: string;
  /** Icon URL override */
  iconUrl?: string;
  /** Username override */
  username?: string;
  /** Message metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Slack block
 */
export interface SlackBlock {
  type: string;
  block_id?: string;
  [key: string]: unknown;
}

/**
 * Slack attachment (legacy)
 */
export interface SlackAttachment {
  fallback?: string;
  color?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
  actions?: SlackAction[];
}

/**
 * Slack interactive action
 */
export interface SlackAction {
  type: 'button' | 'select' | 'conversations_select' | 'users_select' | 'datepicker';
  action_id: string;
  text?: { type: string; text: string; emoji?: string };
  url?: string;
  style?: 'primary' | 'danger';
  value?: string;
  options?: Array<{ text: { type: string; text: string }; value: string }>;
  placeholder?: { type: string; text: string };
}

/**
 * Slack response
 */
export interface SlackResponse {
  ok: boolean;
  channel?: string;
  ts?: string;
  message?: {
    bot_id?: string;
    type: string;
    text: string;
    user?: string;
    ts: string;
    team?: string;
    bot_profile?: {
      id: string;
      name: string;
      icons: Record<string, string>;
    };
  };
  error?: string;
  needed?: string;
  provided?: string;
}

/**
 * Slack user profile
 */
export interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  color: string;
  real_name: string;
  tz: string;
  tz_label: string;
  tz_offset: number;
  profile: {
    avatar_hash: string;
    status_text: string;
    status_emoji: string;
    real_name: string;
    display_name: string;
    real_name_normalized: string;
    display_name_normalized: string;
    email?: string;
    image_24: string;
    image_32: string;
    image_48: string;
    image_72: string;
    image_192: string;
    image_512: string;
  };
  is_admin: boolean;
  is_owner: boolean;
  is_bot: boolean;
  is_stranger?: boolean;
  updated: number;
  is_app_user: boolean;
  is_invited_user?: boolean;
}

/**
 * Slack channel
 */
export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  created: number;
  is_archived: boolean;
  is_general: boolean;
  unlinked: number;
  name_normalized: string;
  is_shared: boolean;
  is_org_shared: boolean;
  is_pending_ext_shared: boolean;
  pending_shared: string[];
  context_team_id: string;
  updated: number;
  parent_conversation?: string;
  creator: string;
  is_member: boolean;
  is_open: boolean;
  is_read_only: boolean;
  topic: { value: string; creator: string; last_set: number };
  purpose: { value: string; creator: string; last_set: number };
  previous_names?: string[];
  num_members?: number;
  locale?: string;
}

// ============================================
// Slack Connector Instance
// ============================================

/**
 * Slack connector implementation
 */
export class SlackConnectorInstance extends HttpConnectorInstance<SlackConfig> {
  private botToken: string | null = null;
  private circuitBreaker: CircuitBreaker;

  constructor(definition: Connector<SlackConfig>, config: SlackConfig) {
    super(definition, {
      ...config,
      baseUrl: 'https://slack.com/api'
    });

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
      successThreshold: 2
    });
  }

  /**
   * Initialize and validate credentials
   */
  protected async doInitialize(): Promise<void> {
    // Get bot token from config or secret provider
    if (this.config.botToken) {
      this.botToken = this.config.botToken;
    } else if (this.config.secretProvider) {
      this.botToken = await this.config.secretProvider.getSecret('slack_bot_token') || null;
    }

    if (!this.botToken) {
      throw new Error('Slack bot token is required');
    }

    // Validate token by making a test API call
    const result = await this.makeApiCall('auth.test', {});
    if (!result.ok) {
      throw new Error(`Slack authentication failed: ${result.error}`);
    }
  }

  /**
   * Execute Slack operation
   */
  protected async doExecute<T>(
    operation: string,
    input: Record<string, unknown>
  ): Promise<OperationResult<T>> {
    if (!this.circuitBreaker.canExecute()) {
      return {
        success: false,
        error: {
          code: 'CIRCUIT_BREAKER_OPEN',
          message: 'Circuit breaker is open - too many recent failures'
        }
      };
    }

    try {
      const result = await this.executeOperation<T>(operation, input);
      this.circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      return {
        success: false,
        error: {
          code: 'SLACK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          cause: error
        }
      };
    }
  }

  /**
   * Execute specific operation
   */
  private async executeOperation<T>(
    operation: string,
    input: Record<string, unknown>
  ): Promise<OperationResult<T>> {
    switch (operation) {
      case 'sendMessage':
        return this.sendMessage(input as unknown as SlackMessage) as Promise<OperationResult<T>>;
      
      case 'postMessage':
        return this.sendMessage(input as unknown as SlackMessage) as Promise<OperationResult<T>>;
      
      case 'updateMessage':
        return this.updateMessage(input) as Promise<OperationResult<T>>;
      
      case 'deleteMessage':
        return this.deleteMessage(input) as Promise<OperationResult<T>>;
      
      case 'getChannel':
        return this.getChannel(input.channel as string) as Promise<OperationResult<T>>;
      
      case 'listChannels':
        return this.listChannels() as Promise<OperationResult<T>>;
      
      case 'getUser':
        return this.getUser(input.user as string) as Promise<OperationResult<T>>;
      
      case 'listUsers':
        return this.listUsers() as Promise<OperationResult<T>>;
      
      case 'sendEphemeral':
        return this.sendEphemeral(input) as Promise<OperationResult<T>>;
      
      case 'addReaction':
        return this.addReaction(input) as Promise<OperationResult<T>>;
      
      case 'removeReaction':
        return this.removeReaction(input) as Promise<OperationResult<T>>;
      
      default:
        return {
          success: false,
          error: {
            code: 'UNKNOWN_OPERATION',
            message: `Unknown operation: ${operation}`
          }
        };
    }
  }

  // ========================================
  // Message Operations
  // ========================================

  /**
   * Send a message to Slack
   */
  private async sendMessage(message: SlackMessage): Promise<OperationResult<SlackResponse>> {
    const payload: Record<string, unknown> = {
      channel: message.channel,
      text: message.text || '',
    };

    if (message.blocks) payload.blocks = message.blocks;
    if (message.attachments) payload.attachments = message.attachments;
    if (message.threadTs) payload.thread_ts = message.threadTs;
    if (message.replyBroadcast) payload.reply_broadcast = message.replyBroadcast;
    if (message.unfurlLinks !== undefined) payload.unfurl_links = message.unfurlLinks;
    if (message.unfurlMedia !== undefined) payload.unfurl_media = message.unfurlMedia;
    if (message.iconEmoji) payload.icon_emoji = message.iconEmoji;
    if (message.iconUrl) payload.icon_url = message.iconUrl;
    if (message.username) payload.username = message.username;
    if (message.metadata) payload.metadata = message.metadata;

    const response = await this.makeApiCall('chat.postMessage', payload);

    if (response.ok) {
      return {
        success: true,
        data: response
      };
    }

    return {
      success: false,
      error: {
        code: response.error || 'SEND_MESSAGE_ERROR',
        message: `Failed to send message: ${response.error}`,
        details: response
      }
    };
  }

  /**
   * Update a message
   */
  private async updateMessage(input: Record<string, unknown>): Promise<OperationResult<SlackResponse>> {
    const response = await this.makeApiCall('chat.update', {
      channel: input.channel,
      ts: input.ts,
      text: input.text,
      blocks: input.blocks
    });

    if (response.ok) {
      return { success: true, data: response };
    }

    return {
      success: false,
      error: {
        code: response.error || 'UPDATE_MESSAGE_ERROR',
        message: `Failed to update message: ${response.error}`
      }
    };
  }

  /**
   * Delete a message
   */
  private async deleteMessage(input: Record<string, unknown>): Promise<OperationResult<SlackResponse>> {
    const response = await this.makeApiCall('chat.delete', {
      channel: input.channel,
      ts: input.ts
    });

    if (response.ok) {
      return { success: true, data: response };
    }

    return {
      success: false,
      error: {
        code: response.error || 'DELETE_MESSAGE_ERROR',
        message: `Failed to delete message: ${response.error}`
      }
    };
  }

  /**
   * Send ephemeral message (visible only to one user)
   */
  private async sendEphemeral(input: Record<string, unknown>): Promise<OperationResult<SlackResponse>> {
    const response = await this.makeApiCall('chat.postEphemeral', {
      channel: input.channel,
      user: input.user,
      text: input.text,
      blocks: input.blocks
    });

    if (response.ok) {
      return { success: true, data: response };
    }

    return {
      success: false,
      error: {
        code: response.error || 'EPHEMERAL_MESSAGE_ERROR',
        message: `Failed to send ephemeral message: ${response.error}`
      }
    };
  }

  // ========================================
  // Reaction Operations
  // ========================================

  /**
   * Add reaction to a message
   */
  private async addReaction(input: Record<string, unknown>): Promise<OperationResult<SlackResponse>> {
    const response = await this.makeApiCall('reactions.add', {
      channel: input.channel,
      timestamp: input.ts,
      name: input.emoji
    });

    if (response.ok) {
      return { success: true, data: response };
    }

    return {
      success: false,
      error: {
        code: response.error || 'ADD_REACTION_ERROR',
        message: `Failed to add reaction: ${response.error}`
      }
    };
  }

  /**
   * Remove reaction from a message
   */
  private async removeReaction(input: Record<string, unknown>): Promise<OperationResult<SlackResponse>> {
    const response = await this.makeApiCall('reactions.remove', {
      channel: input.channel,
      timestamp: input.ts,
      name: input.emoji
    });

    if (response.ok) {
      return { success: true, data: response };
    }

    return {
      success: false,
      error: {
        code: response.error || 'REMOVE_REACTION_ERROR',
        message: `Failed to remove reaction: ${response.error}`
      }
    };
  }

  // ========================================
  // Channel Operations
  // ========================================

  /**
   * Get channel info
   */
  private async getChannel(channelId: string): Promise<OperationResult<SlackChannel>> {
    const response = await this.makeApiCall('conversations.info', {
      channel: channelId
    });

    if (response.ok) {
      return { success: true, data: response.channel as SlackChannel };
    }

    return {
      success: false,
      error: {
        code: response.error || 'GET_CHANNEL_ERROR',
        message: `Failed to get channel: ${response.error}`
      }
    };
  }

  /**
   * List channels
   */
  private async listChannels(): Promise<OperationResult<SlackChannel[]>> {
    const response = await this.makeApiCall('conversations.list', {
      types: 'public_channel,private_channel',
      limit: 1000
    });

    if (response.ok) {
      return { success: true, data: response.channels as SlackChannel[] };
    }

    return {
      success: false,
      error: {
        code: response.error || 'LIST_CHANNELS_ERROR',
        message: `Failed to list channels: ${response.error}`
      }
    };
  }

  // ========================================
  // User Operations
  // ========================================

  /**
   * Get user info
   */
  private async getUser(userId: string): Promise<OperationResult<SlackUser>> {
    const response = await this.makeApiCall('users.info', {
      user: userId
    });

    if (response.ok) {
      return { success: true, data: response.user as SlackUser };
    }

    return {
      success: false,
      error: {
        code: response.error || 'GET_USER_ERROR',
        message: `Failed to get user: ${response.error}`
      }
    };
  }

  /**
   * List users
   */
  private async listUsers(): Promise<OperationResult<SlackUser[]>> {
    const response = await this.makeApiCall('users.list', {
      limit: 1000
    });

    if (response.ok) {
      return { success: true, data: response.members as SlackUser[] };
    }

    return {
      success: false,
      error: {
        code: response.error || 'LIST_USERS_ERROR',
        message: `Failed to list users: ${response.error}`
      }
    };
  }

  // ========================================
  // API Helper
  // ========================================

  /**
   * Make a Slack API call
   */
  private async makeApiCall(
    method: string,
    payload: Record<string, unknown>
  ): Promise<SlackResponse & Record<string, unknown>> {
    const url = `${this.baseUrl}/${method}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as SlackResponse & Record<string, unknown>;
    
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
    }

    return data;
  }

  // ========================================
  // Health Check
  // ========================================

  /**
   * Health check
   */
  protected async doHealthCheck(): Promise<HealthCheckResult> {
    try {
      const response = await this.makeApiCall('auth.test', {});
      
      return {
        healthy: response.ok,
        message: response.ok ? 'Slack connection healthy' : `Error: ${response.error}`,
        details: response
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Health check failed: ${error}`
      };
    }
  }

  /**
   * Cleanup
   */
  protected async doClose(): Promise<void> {
    // Nothing to clean up
  }
}

// ============================================
// Slack Connector Definition
// ============================================

/**
 * Slack connector definition
 */
export const slackConnector: Connector<SlackConfig> = {
  name: 'slack',
  version: '1.0.0',
  description: 'Slack messaging and collaboration integration',

  auth: {
    type: 'bearer',
    description: 'Slack Bot Token (xoxb-)',
    docs: 'https://api.slack.com/authentication/basics'
  },

  rateLimits: {
    requestsPerMinute: 60,
    burstLimit: 10,
    byOperation: {
      'chat.postMessage': { requestsPerMinute: 60 },
      'conversations.list': { requestsPerMinute: 20 }
    }
  },

  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    retryOn: [429, 500, 502, 503, 504]
  },

  operations: {
    'sendMessage': {
      name: 'Send Message',
      description: 'Send a message to a channel or user',
      input: {
        type: 'object',
        required: ['channel'],
        properties: {
          channel: { type: 'string', description: 'Channel ID or name' },
          text: { type: 'string', description: 'Message text' },
          blocks: { type: 'array', description: 'Block Kit blocks' },
          threadTs: { type: 'string', description: 'Thread timestamp for reply' }
        }
      },
      output: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          channel: { type: 'string' },
          ts: { type: 'string' }
        }
      }
    },

    'updateMessage': {
      name: 'Update Message',
      description: 'Update an existing message',
      input: {
        type: 'object',
        required: ['channel', 'ts'],
        properties: {
          channel: { type: 'string' },
          ts: { type: 'string' },
          text: { type: 'string' },
          blocks: { type: 'array' }
        }
      },
      output: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          channel: { type: 'string' },
          ts: { type: 'string' }
        }
      }
    },

    'deleteMessage': {
      name: 'Delete Message',
      description: 'Delete a message',
      input: {
        type: 'object',
        required: ['channel', 'ts'],
        properties: {
          channel: { type: 'string' },
          ts: { type: 'string' }
        }
      },
      output: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' }
        }
      }
    },

    'getChannel': {
      name: 'Get Channel',
      description: 'Get channel information',
      input: {
        type: 'object',
        required: ['channel'],
        properties: {
          channel: { type: 'string', description: 'Channel ID' }
        }
      },
      output: {
        type: 'object'
      }
    },

    'listChannels': {
      name: 'List Channels',
      description: 'List all channels the bot has access to',
      input: {
        type: 'object',
        properties: {}
      },
      output: {
        type: 'array'
      }
    },

    'getUser': {
      name: 'Get User',
      description: 'Get user information',
      input: {
        type: 'object',
        required: ['user'],
        properties: {
          user: { type: 'string', description: 'User ID' }
        }
      },
      output: {
        type: 'object'
      }
    },

    'listUsers': {
      name: 'List Users',
      description: 'List all users in the workspace',
      input: {
        type: 'object',
        properties: {}
      },
      output: {
        type: 'array'
      }
    },

    'addReaction': {
      name: 'Add Reaction',
      description: 'Add a reaction emoji to a message',
      input: {
        type: 'object',
        required: ['channel', 'ts', 'emoji'],
        properties: {
          channel: { type: 'string' },
          ts: { type: 'string' },
          emoji: { type: 'string', description: 'Emoji name without colons' }
        }
      },
      output: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' }
        }
      }
    }
  },

  events: {
    'message': {
      name: 'Message Event',
      description: 'Triggered when a message is posted',
      schema: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          channel: { type: 'string' },
          user: { type: 'string' },
          text: { type: 'string' },
          ts: { type: 'string' }
        }
      }
    },
    'app_mention': {
      name: 'App Mention',
      description: 'Triggered when the bot is mentioned',
      schema: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          user: { type: 'string' },
          text: { type: 'string' },
          ts: { type: 'string' },
          channel: { type: 'string' }
        }
      }
    },
    'reaction_added': {
      name: 'Reaction Added',
      description: 'Triggered when a reaction is added',
      schema: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          user: { type: 'string' },
          reaction: { type: 'string' },
          item: { type: 'object' }
        }
      }
    }
  },

  constraints: [
    {
      type: 'rate_limit',
      description: 'Slack API rate limits',
      config: {
        tier: 'T3',
        requestsPerMinute: 60
      }
    }
  ]
};

// ============================================
// Factory Functions
// ============================================

/**
 * Create Slack connector instance
 */
export function createSlackConnector(config: SlackConfig): SlackConnectorInstance {
  return new SlackConnectorInstance(slackConnector, config);
}

// ============================================
// Block Kit Helpers
// ============================================

/**
 * Create a section block
 */
export function createSectionBlock(text: string, options?: { 
  blockId?: string;
  fields?: string[];
  accessory?: Record<string, unknown>;
}): SlackBlock {
  const block: SlackBlock = {
    type: 'section',
    text: { type: 'mrkdwn', text }
  };
  
  if (options?.blockId) block.block_id = options.blockId;
  if (options?.fields) {
    block.fields = options.fields.map(f => ({ type: 'mrkdwn', text: f }));
  }
  if (options?.accessory) block.accessory = options.accessory;
  
  return block;
}

/**
 * Create an actions block
 */
export function createActionsBlock(actions: SlackAction[], blockId?: string): SlackBlock {
  const block: SlackBlock = {
    type: 'actions',
    elements: actions
  };
  
  if (blockId) block.block_id = blockId;
  
  return block;
}

/**
 * Create a button action
 */
export function createButton(
  actionId: string,
  text: string,
  options?: { value?: string; style?: 'primary' | 'danger'; url?: string }
): SlackAction {
  const button: SlackAction = {
    type: 'button',
    action_id: actionId,
    text: { type: 'plain_text', text }
  };
  
  if (options?.value) button.value = options.value;
  if (options?.style) button.style = options.style;
  if (options?.url) button.url = options.url;
  
  return button;
}

/**
 * Create a header block
 */
export function createHeaderBlock(text: string, blockId?: string): SlackBlock {
  const block: SlackBlock = {
    type: 'header',
    text: { type: 'plain_text', text }
  };
  
  if (blockId) block.block_id = blockId;
  
  return block;
}

/**
 * Create a divider block
 */
export function createDividerBlock(blockId?: string): SlackBlock {
  const block: SlackBlock = { type: 'divider' };
  if (blockId) block.block_id = blockId;
  return block;
}

/**
 * Create an image block
 */
export function createImageBlock(
  imageUrl: string, 
  altText: string, 
  options?: { title?: string; blockId?: string }
): SlackBlock {
  const block: SlackBlock = {
    type: 'image',
    image_url: imageUrl,
    alt_text: altText
  };
  
  if (options?.title) block.title = { type: 'plain_text', text: options.title };
  if (options?.blockId) block.block_id = options.blockId;
  
  return block;
}

/**
 * Create a context block
 */
export function createContextBlock(elements: Array<{ type: string; text?: string; image_url?: string; alt_text?: string }>): SlackBlock {
  return {
    type: 'context',
    elements: elements.map(e => ({
      type: e.type,
      ...(e.text && { text: { type: 'mrkdwn', text: e.text } }),
      ...(e.image_url && { image_url: e.image_url, alt_text: e.alt_text || '' })
    }))
  };
}

// ============================================
// Exports
// ============================================

export default {
  SlackConnectorInstance,
  slackConnector,
  createSlackConnector,
  createSectionBlock,
  createActionsBlock,
  createButton,
  createHeaderBlock,
  createDividerBlock,
  createImageBlock,
  createContextBlock
};
