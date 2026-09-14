export interface Attachment {
  filename: string;
  contentType?: string;
  content: string;
}
export interface Draft {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  text?: string;
  attachments?: Attachment[];
  replyToId?: string;
  version?: number;
}
export interface Queued {
  id: string;
  thread_id: string;
  status: "queued";
}
export interface Message {
  id: string;
  thread_id: string;
  subject: string;
  body_text: string;
  from_address: string;
  revision: number;
  [key: string]: unknown;
}
export interface SenderRule {
  id: string;
  match_type: "email" | "domain";
  match_value: string;
  policy: string;
  paused: boolean;
  paused_until: string | null;
}
export class ExpectboxAgent {
  constructor(options: { apiKey: string; baseUrl?: string; timeoutMs?: number });
  inboxes(): Promise<{
    items: { id: string; email: string; name: string; mode: string }[];
  }>;
  senders(inbox: string): Promise<{ items: SenderRule[] }>;
  allowSender(
    inbox: string,
    body: { matchType: "email" | "domain"; matchValue: string; reason: string },
  ): Promise<{ created: boolean; rule: SenderRule }>;
  messages(
    inbox: string,
    query?: {
      before?: string;
      beforeId?: string;
      q?: string;
      limit?: number;
      folder?: string;
    },
  ): Promise<{
    items: Message[];
    next: { before: string; beforeId: string } | null;
  }>;
  message(inbox: string, id: string): Promise<Message>;
  thread(inbox: string, id: string): Promise<{ items: Message[] }>;
  attachment(inbox: string, id: string): Promise<Uint8Array>;
  draft(inbox: string, body: Draft): Promise<Message>;
  editDraft(
    inbox: string,
    id: string,
    body: Draft & { version: number },
  ): Promise<Message>;
  send(inbox: string, body: Draft, idempotencyKey: string): Promise<Queued>;
  reply(
    inbox: string,
    id: string,
    body: Pick<Draft, "text" | "attachments">,
    idempotencyKey: string,
  ): Promise<Queued>;
  events(cursor?: string): Promise<{
    items: {
      id: string;
      type: string;
      inbox_id: string;
      message_id: string | null;
      detail: Record<string, unknown>;
      created_at: string;
    }[];
    cursor: string;
    retentionDays: number;
  }>;
}

export type AgentScope = 'messages:read' | 'attachments:read' | 'drafts:write' | 'messages:send' | 'events:read' | 'senders:write';
export interface Inbox { id: string; email: string; name: string; }
export interface CreateInbox {
  name: string; username: string;
  mode?: 'read' | 'drafts' | 'send'; sendAllow?: string[];
  senderManagementMode?: 'none' | 'restricted' | 'any'; senderManagementAllow?: string[];
}
export interface InboxKeyOptions { name: string; scopes: AgentScope[]; days?: number; }
export class ExpectboxProject {
  constructor(options: { apiKey: string; baseUrl?: string; timeoutMs?: number });
  project(): Promise<{ id: string; limits: { inboxes: number; monthly: number; daily: number; bytes: number }; usage: { incoming: number; outgoing: number } }>;
  inboxes(): Promise<{ inboxes: (Inbox & { mode: string; paused: boolean; retired_at: string | null; created_at: string })[] }>;
  createInbox(body: CreateInbox, idempotencyKey: string): Promise<Inbox>;
  createInboxKey(inbox: string, body: InboxKeyOptions): Promise<{ id: string; key: string }>;
  revokeInboxKey(inbox: string, key: string): Promise<{ ok: true }>;
}
