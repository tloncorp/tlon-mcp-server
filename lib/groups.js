export async function listGroups(api) {
  return await api.scry({
    app: "groups",
    path: "/groups/light",
  });
}

export async function getGroupInfo(api, group) {
  const cleanFlag = group.replace(/^~/, "");
  return await api.scry({
    app: "groups",
    path: `/groups/~${cleanFlag}/v1`,
  });
}

export async function listGroupMembers(api, group) {
  const groupData = await getGroupInfo(api, group);
  const fleet = groupData?.fleet || {};
  const members = Object.entries(fleet).map(([ship, data]) => ({
    ship: ship.startsWith("~") ? ship : `~${ship}`,
    roles: data.sects || [],
    joined: data.joined,
  }));
  return {
    group,
    memberCount: members.length,
    members,
  };
}

export async function listGroupChannels(api, group) {
  const groupData = await getGroupInfo(api, group);
  const channels = Object.entries(groupData?.channels || {}).map(
    ([nest, data]) => ({
      nest,
      ...data.meta,
      readers: data.readers || [],
      writers: data.writers || [],
    })
  );
  return {
    group,
    channelCount: channels.length,
    channels,
  };
}

export async function inviteToGroup(api, group, ships) {
  const cleanFlag = group.replace(/^~/, "");
  const cleanShips = ships.map((s) =>
    s.startsWith("~") ? s : "~" + s
  );
  return await api.poke({
    app: "groups",
    mark: "group-action",
    json: {
      flag: `~${cleanFlag}`,
      update: {
        invite: { ships: cleanShips },
      },
    },
  });
}

export async function assignRole(api, group, ship, role) {
  const cleanFlag = group.replace(/^~/, "");
  const cleanShip = ship.startsWith("~") ? ship : "~" + ship;
  return await api.poke({
    app: "groups",
    mark: "group-action",
    json: {
      flag: `~${cleanFlag}`,
      update: {
        "add-sects": {
          ship: cleanShip,
          sects: [role],
        },
      },
    },
  });
}

export async function removeRole(api, group, ship, role) {
  const cleanFlag = group.replace(/^~/, "");
  const cleanShip = ship.startsWith("~") ? ship : "~" + ship;
  return await api.poke({
    app: "groups",
    mark: "group-action",
    json: {
      flag: `~${cleanFlag}`,
      update: {
        "del-sects": {
          ship: cleanShip,
          sects: [role],
        },
      },
    },
  });
}
