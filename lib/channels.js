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
