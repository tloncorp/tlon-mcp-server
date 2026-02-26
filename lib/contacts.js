export async function getContacts(api) {
  try {
    return await api.scry({
      app: "contacts",
      path: "/all",
    });
  } catch (error) {
    throw new Error(error.message || "Failed to fetch contacts");
  }
}

export function formatContacts(contacts) {
  const formatted = {
    byShip: {},
    byNickname: {},
    byEmail: {},
    byPhone: {},
  };

  Object.entries(contacts || {}).forEach(([ship, data]) => {
    if (!data) return;

    const cleanShip = ship.startsWith("~") ? ship : `~${ship}`;

    formatted.byShip[cleanShip] = {
      ...data,
      ship: cleanShip,
    };

    if (data.nickname && typeof data.nickname === "string") {
      formatted.byNickname[data.nickname.toLowerCase()] = cleanShip;
    }

    if (data.email && typeof data.email === "string") {
      formatted.byEmail[data.email.toLowerCase()] = cleanShip;
    }

    if (data.phone && typeof data.phone === "string") {
      formatted.byPhone[data.phone] = cleanShip;
    }
  });

  return formatted;
}

export async function getProfile(api, ship) {
  return await api.scry({
    app: "contacts",
    path: `/contact/${ship}`,
  });
}

export async function updateProfile(api, fields) {
  return await api.poke({
    app: "contacts",
    mark: "contact-action",
    json: { edit: fields },
  });
}
