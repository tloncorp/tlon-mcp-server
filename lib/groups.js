export async function listGroups(api) {
  return await api.scry({
    app: "groups",
    path: "/groups/light",
  });
}

export async function getGroupInfo(api, group) {
  return await api.scry({
    app: "groups",
    path: `/groups/${group}/v1`,
  });
}

export async function listGroupMembers(api, group) {
  const groupData = await getGroupInfo(api, group);
  return groupData?.fleet || {};
}

export async function listGroupChannels(api, group) {
  const groupData = await getGroupInfo(api, group);
  return groupData?.channels || {};
}

export async function inviteToGroup(api, group, ships) {
  return await api.poke({
    app: "groups",
    mark: "group-action",
    json: {
      flag: group,
      update: {
        invite: { ships },
      },
    },
  });
}

export async function assignRole(api, group, ship, role) {
  return await api.poke({
    app: "groups",
    mark: "group-action",
    json: {
      flag: group,
      update: {
        "add-sects": {
          ship,
          sects: [role],
        },
      },
    },
  });
}

export async function removeRole(api, group, ship, role) {
  return await api.poke({
    app: "groups",
    mark: "group-action",
    json: {
      flag: group,
      update: {
        "del-sects": {
          ship,
          sects: [role],
        },
      },
    },
  });
}
