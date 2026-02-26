import { unixToDa, formatUd } from "@urbit/aura";

export function createJsonResponse(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function createErrorResponse(error) {
  if (error) {
    console.error("Error:", error);
  }
  const message = error?.message || "Unknown error occurred";
  return {
    content: [
      {
        type: "text",
        text: `Error: ${message}`,
      },
    ],
    isError: true,
  };
}

export function parseNest(nest) {
  if (!nest || typeof nest !== "string") {
    throw new Error("Channel nest is required");
  }

  const parts = nest.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("Invalid channel nest. Expected kind/~host/name");
  }

  const [kind, host, ...rest] = parts;
  const name = rest.join("/");
  const flag = [host, ...rest].join("/");

  return {
    kind,
    host,
    name,
    flag,
  };
}

export function formatStory(text) {
  return [{ inline: [text] }];
}

export function generatePostId(sentAt = Date.now()) {
  return formatUd(unixToDa(sentAt).toString());
}

function normalizeInline(content) {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => normalizeInline(block))
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  if (content.inline && Array.isArray(content.inline)) {
    return content.inline.join(" ").trim();
  }

  if (content.text) return String(content.text);

  if (content.content) {
    return normalizeInline(content.content);
  }

  return "";
}

function normalizeSent(sent) {
  if (!sent) {
    return { sent: null, timestamp: null };
  }

  if (typeof sent === "number") {
    return { sent: new Date(sent).toISOString(), timestamp: sent };
  }

  if (typeof sent === "string") {
    const parsed = Date.parse(sent);
    return {
      sent,
      timestamp: Number.isNaN(parsed) ? null : parsed,
    };
  }

  return { sent: null, timestamp: null };
}

export function formatChannelHistory(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((entry, index) => ({
      id: entry.id || String(index),
      author: entry.author || entry.ship || null,
      content: normalizeInline(entry.content || entry.memo?.content),
      ...normalizeSent(entry.sent || entry.memo?.sent),
    }));
  }

  if (typeof raw !== "object") return [];

  const formatted = [];
  for (const [id, data] of Object.entries(raw)) {
    const post = data?.post || data?.memo || data?.essay || data || {};
    const author =
      post.author ||
      post.ship ||
      post.essay?.author ||
      post.memo?.author ||
      data?.author ||
      null;
    const sentValue =
      post.sent ||
      post.essay?.sent ||
      post.memo?.sent ||
      data?.sent ||
      null;
    const contentValue =
      post.content ||
      post.essay?.content ||
      post.memo?.content ||
      data?.content ||
      null;

    const content = normalizeInline(contentValue);
    const normalizedSent = normalizeSent(sentValue);

    formatted.push({
      id,
      author,
      content,
      ...normalizedSent,
    });
  }

  const withTimestamp = formatted.filter((entry) => entry.timestamp !== null);
  if (withTimestamp.length > 0) {
    withTimestamp.sort((a, b) => b.timestamp - a.timestamp);
    return withTimestamp.concat(
      formatted.filter((entry) => entry.timestamp === null)
    );
  }

  return formatted;
}
