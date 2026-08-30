export type ScheduleTarget = Date[] | number;

export function getScheduleDelay(target: ScheduleTarget, now = Date.now()) {
  if (typeof target === "number") return target * 1000;
  if (target.length === 0) return 60_000;

  return target
    .map((date) => date.getTime() - now)
    .reduce((nearest, delay) => Math.min(nearest, delay), 3_600_000);
}

export function shouldRunDatabaseSeed(environment: string | undefined) {
  return environment === "development";
}

export function isDatabaseSeeded(existingSettings: readonly unknown[]) {
  return existingSettings.length > 0;
}

export function adminExists(existingAdmins: readonly unknown[]) {
  return existingAdmins.length > 0;
}

const cardErrors: Record<string, string> = {
  "The showcase for this UID is private": "ผู้เล่นนี้ไม่มีโชว์เคส มองไม่เห็นตัวละครใดๆ",
  "Character not found in showcase": "ตัวละครที่ผู้เล่นเลือก ไม่ได้อยู่ในโชว์เคส",
  "Invalid UID Provided": "ผู้เล่นนี้ไม่มีอยู่จริง โดนแบนไปแล้วรีเปล่า",
};

export type CardFailureDecision = {
  error: string;
  stopRetrying: boolean;
};

export function decideCardFailure(
  responseText: string,
  status: number,
): CardFailureDecision {
  const translated = cardErrors[responseText];
  let error = translated ?? responseText;
  if (!translated && (error.length > 2000 || status === 502)) {
    error = "ไม่สามารถสร้างการ์ดได้ กำลังพยายามลองใหม่";
  }
  error = error.split("\n")[0];

  return {
    error,
    stopRetrying:
      status === 400 || error === "ผู้เล่นนี้ไม่มีโชว์เคส มองไม่เห็นตัวละครใดๆ",
  };
}

export type SubscriberMessage = {
  data: unknown;
  event?: string;
};

export function parseSubscriberMessage(
  payload: string,
): SubscriberMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || !("data" in parsed)) return null;
  const event = "event" in parsed ? parsed.event : undefined;
  if (event !== undefined && typeof event !== "string") return null;

  return { data: parsed.data, event };
}

export type RubgramWebhookEvent = {
  type: "submit" | "paid";
  sub: string;
};

export function decideRubgramWebhook(
  message: SubscriberMessage,
  webhookUrl: string | undefined,
): RubgramWebhookEvent | null {
  if (message.event !== "update" || !webhookUrl) return null;
  if (!message.data || typeof message.data !== "object") return null;

  const { type, sub } = message.data as Record<string, unknown>;
  if (!(type === "submit" || type === "paid") || typeof sub !== "string") {
    return null;
  }

  return { type, sub };
}
