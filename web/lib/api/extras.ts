import type { APIClient } from "./client";
import type { HistoryItem, NotificationItem, Recommendation } from "@/lib/types";

/** Last.fm history sync + listing. */
export class HistoryAPI {
  constructor(private readonly client: APIClient) {}

  /** Walks Last.fm history (bounded), inserts new scrobbles. */
  async sync(): Promise<{ inserted: number; pages_walked: number }> {
    return this.client.request("/me/history/sync", { method: "POST" });
  }

  async list(limit = 20): Promise<HistoryItem[]> {
    const res = await this.client.request<{ history: HistoryItem[] }>("/me/history", {
      query: { limit: String(limit) },
    });
    return res.history;
  }
}

export class RecommendationsAPI {
  constructor(private readonly client: APIClient) {}

  async list(): Promise<Recommendation[]> {
    const res = await this.client.request<{ recommendations: Recommendation[] }>("/recommendations");
    return res.recommendations;
  }
}

export class NotificationsAPI {
  constructor(private readonly client: APIClient) {}

  async list(): Promise<{ items: NotificationItem[]; unread: number }> {
    const res = await this.client.request<{ notifications: NotificationItem[]; unread: number }>("/notifications");
    return { items: res.notifications, unread: res.unread };
  }

  async markRead(): Promise<void> {
    await this.client.request("/notifications/mark-read", { method: "POST" });
  }
}
