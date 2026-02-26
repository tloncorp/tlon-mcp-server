import { Urbit } from "@urbit/http-api";

export function initUrbitGlobals() {
  if (typeof global.window === "undefined") {
    global.window = { fetch: global.fetch };
  }
  if (typeof global.document === "undefined") {
    global.document = {
      hidden: true,
      addEventListener() {},
      removeEventListener() {},
    };
  }
}

export function patchUrbitConnect() {
  if (Urbit.prototype.__tlonMcpPatched) return;

  const { connect } = Urbit.prototype;
  Urbit.prototype.connect = async function patchedConnect() {
    const resp = await fetch(`${this.url}/~/login`, {
      method: "POST",
      body: `password=${this.code}`,
      credentials: "include",
    });

    if (resp.status >= 400) {
      throw new Error("Login failed with status " + resp.status);
    }

    const cookie = resp.headers.get("set-cookie");
    if (cookie) {
      const match = /urbauth-~([\w-]+)/.exec(cookie);
      if (!this.nodeId && match) {
        this.nodeId = match[1];
      }
      this.cookie = cookie;
    }
    await this.getShipName();
    await this.getOurName();
  };

  Urbit.prototype.connect.__original = connect;
  Urbit.prototype.__tlonMcpPatched = true;
}

export function getConfig() {
  const defaults = {
    ship: "zod",
    code: "lidlut-tabwed-pillex-ridrup",
    host: "http://localhost",
    port: "8080",
  };

  const ship = (process.env.URBIT_SHIP || defaults.ship).replace(/^~/, "");
  const code = process.env.URBIT_CODE || defaults.code;

  if (process.env.URBIT_URL) {
    return {
      ship,
      code,
      host: process.env.URBIT_HOST || defaults.host,
      port: process.env.URBIT_PORT || defaults.port,
      url: process.env.URBIT_URL,
    };
  }

  const host = process.env.URBIT_HOST || defaults.host;
  const port = process.env.URBIT_PORT || defaults.port;

  let url;
  if (/^https?:\/\//.test(host)) {
    url = host;
  } else {
    const scheme = port === "443" ? "https" : "http";
    url = `${scheme}://${host}:${port}`;
  }

  return {
    ship,
    code,
    host,
    port,
    url,
  };
}

export async function ensureConnected(api) {
  try {
    await api.getOurName();
  } catch (error) {
    await api.connect();
  }
}
