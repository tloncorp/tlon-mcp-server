import { formatStory } from "./utils.js";

export async function reactToPost(api, channel, postId, emoji, shipName) {
  return await api.poke({
    app: "channels",
    mark: "channel-action",
    json: {
      channel: {
        nest: channel,
        action: {
          post: {
            "add-react": {
              id: postId,
              react: emoji,
              ship: shipName,
            },
          },
        },
      },
    },
  });
}

export async function unreactToPost(api, channel, postId, shipName) {
  return await api.poke({
    app: "channels",
    mark: "channel-action",
    json: {
      channel: {
        nest: channel,
        action: {
          post: {
            "del-react": {
              id: postId,
              ship: shipName,
            },
          },
        },
      },
    },
  });
}

export async function editPost(api, channel, postId, newContent, author) {
  const story = formatStory(newContent);
  return await api.poke({
    app: "channels",
    mark: "channel-action",
    json: {
      channel: {
        nest: channel,
        action: {
          post: {
            edit: {
              id: postId,
              essay: {
                content: story,
                author,
                sent: Date.now(),
              },
            },
          },
        },
      },
    },
  });
}

export async function deletePost(api, channel, postId) {
  return await api.poke({
    app: "channels",
    mark: "channel-action",
    json: {
      channel: {
        nest: channel,
        action: {
          post: {
            del: postId,
          },
        },
      },
    },
  });
}
