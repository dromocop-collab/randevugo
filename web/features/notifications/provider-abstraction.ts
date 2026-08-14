import type { NotificationType } from "@/types/notification";

export interface NotificationProvider {
  key: string;
  send(payload: {
    to: string;
    type: NotificationType;
    title: string;
    body: string;
  }): Promise<void>;
}

export class NotificationDispatcher {
  constructor(private providers: NotificationProvider[]) {}

  async notifyAll(payload: {
    to: string;
    type: NotificationType;
    title: string;
    body: string;
  }): Promise<void> {
    await Promise.all(this.providers.map((provider) => provider.send(payload)));
  }
}

export const noopProvider: NotificationProvider = {
  key: "noop",
  async send() {
    return;
  },
};
