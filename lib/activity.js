export async function getActivity(api, type, limit) {
  return await api.scry({
    app: "activity",
    path: `/v4/activity/${type}/newest/${limit}`,
  });
}

export async function getUnreads(api) {
  return await api.scry({
    app: "activity",
    path: "/v4/unreads",
  });
}
