import { parseNest, formatStory } from "./utils.js";

export async function getChannelInfo(api, channel) {
  const { kind, flag } = parseNest(channel);
  return await api.scry({
    app: kind,
    path: `/channel/${flag}`,
  });
}

export async function readChannelHistory(api, channel, count = 50) {
  const { kind, flag } = parseNest(channel);
  const capped = Math.max(1, Math.min(count, 100));

  return await api.scry({
    app: kind,
    path: `/channel/${flag}/posts/newest/${capped}/outline`,
  });
}

const CHANNEL_TYPE_MAP = {
  chat: "chat",
  notebook: "diary",
  gallery: "heap",
  diary: "diary",
  heap: "heap",
};

export async function createChannel(api, group, type, name, title, description = "") {
  const kind = CHANNEL_TYPE_MAP[type];
  if (!kind) {
    throw new Error(`Invalid channel type "${type}". Must be one of: chat, notebook, gallery`);
  }

  const cleanGroup = group.replace(/^~/, "");
  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  await api.poke({
    app: "channels",
    mark: "channel-action-1",
    json: {
      create: {
        kind,
        group: `~${cleanGroup}`,
        name: slug,
        title: title || name,
        description,
        meta: null,
        readers: [],
        writers: [],
      },
    },
  });

  const host = `~${cleanGroup}`.split("/")[0];
  const nest = `${kind}/${host}/${slug}`;
  return { success: true, channel: nest, group: `~${cleanGroup}` };
}

export async function sendToChannel(api, channel, message, author) {
  const sentAt = Date.now();
  const story = formatStory(message);

  return await api.poke({
    app: "channels",
    mark: "channel-action",
    json: {
      channel: {
        nest: channel,
        action: {
          post: {
            add: {
              essay: {
                content: story,
                author,
                sent: sentAt,
              },
              memo: null,
            },
          },
        },
      },
    },
  });
}
