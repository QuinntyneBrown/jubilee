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
  /** The conversations of the whole inbox, or of the whole search; more than one answer lists. */
  totalCount: number;
  unreadCount: number;
  /** At most 50: the page asked for. */
  conversations: InboxRow[];
}

export interface MessageAttachment {
  id: string;
  url: string;
  contentType: string;
}

/** The answer of an upload: the id the next send names. */
export interface StoredAttachment {
  id: string;
}

/** A new signed link to a stored photo. */
export interface AttachmentLink {
  url: string;
}

/** A request between the member and the business, as its card in the conversation reads (L2-057 AC4). */
export interface RequestCard {
  id: string;
  kind: 'booking' | 'quote' | 'order';
  kindLabel: string;
  title: string;
  detail: string | null;
  status: 'new' | 'confirmed' | 'declined' | 'cancelled' | 'completed';
  statusLabel: string;
  sentAt: string;
  /** Where "View request" goes. */
  link: string;
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
  /** Absent in a copy saved before request cards existed. */
  requests?: RequestCard[];
}

export interface StartedConversation {
  conversationId: string;
  messageId: string;
}
