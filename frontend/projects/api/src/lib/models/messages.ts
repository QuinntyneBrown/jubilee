/** One row of the inbox (`GET /api/conversations`). */
export interface InboxRow {
  id: string;
  /** The business for a member, the member for an owner. */
  title: string;
  businessName: string;
  businessSlug: string;
  preview: string;
  lastMessageAt: string;
  unread: boolean;
  muted: boolean;
}

export interface Inbox {
  totalCount: number;
  unreadCount: number;
  conversations: InboxRow[];
}

export interface MessageAttachment {
  id: string;
  url: string;
  contentType: string;
}

export interface ChatMessage {
  id: string;
  body: string;
  sentAt: string;
  mine: boolean;
  senderFirstName: string;
  attachment: MessageAttachment | null;
}

export type RepliesBand = 'few-hours' | 'day' | 'few-days';

/** An opened conversation (`GET /api/conversations/{id}`). */
export interface Conversation {
  id: string;
  business: { name: string; slug: string };
  counterpart: { name: string };
  muted: boolean;
  canBlock: boolean;
  awayUntil: string | null;
  replies: RepliesBand | null;
  hasMore: boolean;
  messages: ChatMessage[];
}

export interface StartedConversation {
  conversationId: string;
  messageId: string;
}
