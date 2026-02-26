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
