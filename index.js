import { Urbit } from "@urbit/http-api";
import { unixToDa, formatUd } from "@urbit/aura";
import { FastMCP } from "fastmcp";
import z from "zod";
import {
  initUrbitGlobals,
  patchUrbitConnect,
  getConfig,
  ensureConnected,
} from "./lib/connection.js";
import {
  createErrorResponse,
  createJsonResponse,
  formatChannelHistory,
} from "./lib/utils.js";
import {
  getContacts,
  formatContacts,
  getProfile,
  updateProfile,
} from "./lib/contacts.js";
import {
  listGroups,
  getGroupInfo,
  listGroupMembers,
  listGroupChannels,
  inviteToGroup,
  assignRole,
  removeRole,
  createGroup,
} from "./lib/groups.js";
import {
  getChannelInfo,
  readChannelHistory,
  sendToChannel,
  createChannel,
} from "./lib/channels.js";
import { reactToPost, unreactToPost, editPost, deletePost } from "./lib/posts.js";
import { getActivity, getUnreads } from "./lib/activity.js";

initUrbitGlobals();
patchUrbitConnect();

// Redirect console.log to stderr in stdio mode to avoid interfering with MCP protocol
// Only use normal console.log if explicitly in HTTP mode
if (process.env.MCP_TRANSPORT !== "http") {
  const originalConsoleLog = console.log;
  console.log = function () {
    console.error.apply(console, arguments);
  };
}


/**
 * Sends a direct message to another ship
 *
 * @param {Object} api - The Urbit API instance
 * @param {string} fromShip - The sender's ship name
 * @param {string} toShip - The recipient's ship name
 * @param {string} text - The message text to send
 * @returns {Promise<void>}
 */
async function sendDm(api, fromShip, toShip, text) {
  console.log(`Sending DM to ${toShip}...`);

  try {
    // Verify API connection is still active with a more reliable method
    console.log("Verifying connection status...");
    try {
      // Try to use ship's name as a basic health check
      await api.getOurName();
      console.log("Connection verified");
    } catch (connErr) {
      console.error("Connection check failed:", connErr);
      console.log("Attempting to reconnect...");

      // Re-authenticate
      try {
        await api.connect();
        console.log("Successfully reconnected");
      } catch (reconnErr) {
        console.error("Reconnection failed:", reconnErr);
        throw new Error("Connection to ship lost and reconnection failed");
      }
    }

    const story = [
      {
        inline: [text],
      },
    ];

    const sentAt = Date.now();
    const idUd = formatUd(unixToDa(sentAt).toString());
    const id = `${fromShip}/${idUd}`;

    const delta = {
      add: {
        memo: {
          content: story,
          author: fromShip,
          sent: sentAt,
        },
        kind: null,
        time: null,
      },
    };

    const action = {
      ship: toShip,
      diff: {
        id,
        delta,
      },
    };

    console.log(`Sending message via poke to ${toShip}...`);

    await api.poke({
      app: "chat",
      mark: "chat-dm-action",
      json: action,
      onError: (e) => {
        console.error("Poke error:", e);
        throw e;
      },
    });

    console.log("DM sent successfully!");
    // Return message and recipient in the content array format FastMCP expects
    return {
      content: [{ type: "text", text: `Message sent to ${toShip}` }],
    };
  } catch (error) {
    console.error("Error sending DM:", error);
    let errorMessage = error.message || "Unknown error occurred";

    if (errorMessage.includes("PUT channel")) {
      errorMessage = `Failed to communicate with the ship. Please verify:
1. Your ship is still running at ${api.url}
2. You have the 'chat' app installed and running
3. The recipient (${toShip}) is valid and can receive DMs
4. Try restarting the server if the issue persists`;
    }

    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
}

/**
 * Reads the history of a direct message channel with another ship.
 *
 * @param {Object} api - The Urbit API instance
 * @param {string} fromShip - The caller's ship name (with ~)
 * @param {string} toShip - The counterpart ship name (with ~)
 * @param {number} [count=100] - How many messages to retrieve (max 500)
 * @returns {Promise<Object>} FastMCP formatted response containing DM history
 */
async function readDmHistory(api, fromShip, toShip, count = 100) {
  console.log(`Fetching last ${count} message(s) with ${toShip}...`);

  const cappedCount = Math.max(1, Math.min(count, 500));

  try {
    await ensureConnected(api);

    const scryPath = `/dm/${toShip}/writs/newest/${cappedCount}/light`;
    console.log(`Scrying chat app path: ${scryPath}`);

    const history = await api.scry({
      app: "chat",
      path: scryPath,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(history),
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching DM history:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message || "Unknown error occurred"}`,
        },
      ],
      isError: true,
    };
  }
}


/**
 * Formats DM history data into a more readable structure
 *
 * @param {Object} history - Raw DM history data from the chat agent
 * @param {Object} contacts - Formatted contacts data for nickname lookup
 * @param {string} ownShipName - The name of our own ship (with ~)
 * @returns {Array} Array of formatted messages
 */
function formatDmHistory(history, contacts, ownShipName) {
  const messages = [];

  console.log(
    `Formatting DM history with ${Object.keys(history || {}).length} messages`
  );
  console.log(`Own ship: ${ownShipName}`);

  // Process each message in the history
  Object.entries(history || {}).forEach(([id, data]) => {
    const { memo } = data;
    if (!memo) return;

    // Get sender nickname if available
    const sender = memo.author;
    const senderShip = sender.startsWith("~") ? sender : `~${sender}`;

    // Skip processing if the senderShip doesn't have a value
    if (!senderShip) {
      console.log(`Skipping message with invalid sender: ${sender}`);
      return;
    }

    // Important: Skip incorrect self-identification
    // Don't use a nickname for our own ship to avoid confusion
    let senderName;
    if (senderShip === ownShipName) {
      senderName = ownShipName; // Always use ID for our own messages
      console.log(`Message from myself (${ownShipName})`);
    } else {
      // For other senders, try to get their nickname
      const senderContact = contacts?.byShip[senderShip];
      senderName = senderContact?.nickname || senderShip;
      console.log(`Message from ${senderName} (${senderShip})`);
    }

    // Format the content
    let content = "";
    if (memo.content && Array.isArray(memo.content)) {
      // Extract text from nested inline content structure
      content = memo.content
        .map((block) => {
          if (block.inline) {
            return block.inline.join(" ");
          }
          return "";
        })
        .join("\n")
        .trim();
    }

    messages.push({
      id,
      sender: senderName,
      senderShip: senderShip,
      content: content,
      sent: new Date(memo.sent).toISOString(),
      timestamp: memo.sent,
    });
  });

  // Sort by timestamp, newest first
  return messages.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Resolves a name or nickname to a ship ID
 *
 * @param {Object} api - The Urbit API instance
 * @param {string} nameOrShip - Nickname or ship name (with or without ~)
 * @param {string} ownShipName - The name of our own ship (with ~)
 * @returns {Promise<string>} Resolved ship ID with ~ prefix
 * @throws {Error} If the name cannot be resolved to a ship
 */
async function resolveShipName(api, nameOrShip, ownShipName) {
  if (!nameOrShip) {
    throw new Error("Name or ship ID is required");
  }

  // Case insensitive comparison for common names for "me"
  const selfReferences = ["me", "myself", "i", "self"];
  if (selfReferences.includes(nameOrShip.toLowerCase())) {
    console.log(`Self-reference "${nameOrShip}" resolves to ${ownShipName}`);
    return ownShipName;
  }

  // If it starts with ~, treat as a ship ID
  if (nameOrShip.startsWith("~")) {
    return nameOrShip;
  }

  try {
    // Get raw contacts data
    const rawContacts = await getContacts(api);

    // Log for debugging
    console.log(`Looking up contact nickname: "${nameOrShip}"`);
    console.log(
      `Raw contacts data structure: ${typeof rawContacts}, keys: ${
        Object.keys(rawContacts || {}).length
      }`
    );

    // Format contacts and search by nickname (case insensitive)
    const contacts = formatContacts(rawContacts);
    const lookupName = nameOrShip.toLowerCase();

    // Log formatted structure
    console.log(
      `Formatted nicknames: ${Object.keys(contacts.byNickname).join(", ")}`
    );

    // Important check: make sure we're not identifying ourselves with a nickname
    for (const [nickname, shipId] of Object.entries(contacts.byNickname)) {
      if (shipId === ownShipName) {
        console.log(
          `Warning: Found nickname "${nickname}" for our own ship ${ownShipName}`
        );
        // If we're looking up our own nickname, return our ship
        if (nickname.toLowerCase() === lookupName) {
          console.log(
            `Self-reference via nickname "${nameOrShip}" resolves to ${ownShipName}`
          );
          return ownShipName;
        }
      }
    }

    const ship = contacts.byNickname[lookupName];

    if (!ship) {
      // Direct debug logging of contacts for troubleshooting
      console.log("Available contacts:");
      Object.entries(rawContacts || {}).forEach(([ship, data]) => {
        console.log(`  Ship: ${ship}, Nickname: ${data?.nickname || "none"}`);
      });

      throw new Error(
        `Could not find a contact with the nickname "${nameOrShip}"`
      );
    }

    // Final safety check: verify we're not sending to ourselves
    if (ship === ownShipName) {
      console.log(
        `Warning: "${nameOrShip}" resolves to our own ship ${ownShipName}`
      );
    }

    console.log(`Resolved: "${nameOrShip}" → ${ship}`);
    return ship;
  } catch (error) {
    console.error(`Error resolving name "${nameOrShip}":`, error);
    throw error;
  }
}


/**
 * Set up and run the MCP server with the send-dm tool
 */
async function startMcpServer() {
  const config = getConfig();
  const shipName = `~${config.ship}`;

  console.log(`Setting up MCP server for Tlon at ${config.url}`);
  console.log(`Authenticating as ${shipName}`);

  let api;
  try {
    api = await Urbit.authenticate({
      ship: config.ship,
      url: config.url,
      code: config.code,
      verbose: true,
    });

    // Set a longer timeout value for API calls
    api.requestTimeout = 30000; // 30 seconds

    console.log("Successfully authenticated to ship");
  } catch (error) {
    console.error("Failed to authenticate to ship:", error);
    if (error.message && error.message.includes("PUT channel")) {
      console.error("-----------------------------------------------------");
      console.error("Authentication Error: Failed to PUT channel");
      console.error("Check the following:");
      console.error(
        `1. Is your Urbit ship (${shipName}) running at ${config.url}?`
      );
      console.error(`2. Is the +code (${config.code}) correct?`);
      console.error(
        `3. Try accessing ${config.url} in a browser to verify connectivity`
      );
      console.error("-----------------------------------------------------");
    }
    process.exit(1);
  }

  // Create and configure the MCP server
  const server = new FastMCP({
    name: "Tlon MCP Server",
    version: "0.0.1",
  });

  // Modify send-dm tool to handle nicknames
  server.addTool({
    name: "send-dm",
    description: "Send a direct message to another ship or nickname",
    parameters: z.object({
      recipient: z
        .string()
        .describe("Recipient ship name (with ~) or nickname"),
      message: z.string().describe("Message text to send"),
    }),
    execute: async (params) => {
      try {
        let recipient;

        // If it starts with ~, use it directly as a ship ID
        if (params.recipient.startsWith("~")) {
          recipient = params.recipient;
        } else {
          // Try to resolve as a nickname, passing our ship name
          recipient = await resolveShipName(api, params.recipient, shipName);
        }

        const result = await sendDm(api, shipName, recipient, params.message);
        return result;
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  // Modify read-dm-history tool to handle nicknames
  server.addTool({
    name: "read-dm-history",
    description:
      "Read the latest messages from a direct message channel with another ship or nickname",
    parameters: z
      .object({
        correspondent: z
          .string()
          .describe("Correspondent ship name (with ~) or nickname"),
        count: z
          .number()
          .int()
          .positive()
          .max(500)
          .default(100)
          .describe("Number of messages to fetch (default 100)"),
        format: z
          .enum(["raw", "formatted"])
          .default("formatted")
          .describe(
            "Format of returned data: 'raw' for original JSON, 'formatted' for user-friendly structure"
          ),
      })
      .strict(),
    execute: async (params) => {
      try {
        console.log(
          `Processing read-dm-history request for: "${params.correspondent}"`
        );

        let correspondent;

        // If it starts with ~, use it directly as a ship ID
        if (params.correspondent.startsWith("~")) {
          correspondent = params.correspondent;
          console.log(`Using ship ID directly: ${correspondent}`);
        } else {
          // Try to resolve as a nickname
          console.log(
            `Attempting to resolve nickname: "${params.correspondent}"`
          );
          correspondent = await resolveShipName(
            api,
            params.correspondent,
            shipName
          );
          console.log(`Resolved nickname to ship: ${correspondent}`);
        }

        const count = params.count ?? 100;

        // Get raw DM history
        console.log(
          `Fetching DM history with ${correspondent}, count: ${count}`
        );
        const rawResponse = await readDmHistory(
          api,
          shipName,
          correspondent,
          count
        );

        // Return raw data if requested
        if (params.format === "raw") {
          return rawResponse;
        }

        try {
          // Format the history with contact information
          const rawHistory = JSON.parse(rawResponse.content[0].text);
          const rawContacts = await getContacts(api);
          const contacts = formatContacts(rawContacts);

          // Pass our own ship name to prevent misidentification
          const formattedHistory = formatDmHistory(
            rawHistory,
            contacts,
            shipName
          );

          // Add metadata about the conversation
          const conversationInfo = {
            correspondent: correspondent,
            correspondentNickname:
              contacts.byShip[correspondent]?.nickname || null,
            messageCount: formattedHistory.length,
            startDate:
              formattedHistory.length > 0
                ? formattedHistory[formattedHistory.length - 1].sent
                : null,
            endDate:
              formattedHistory.length > 0 ? formattedHistory[0].sent : null,
          };

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    meta: conversationInfo,
                    messages: formattedHistory,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (formatError) {
          console.error("Error formatting history:", formatError);
          // Fall back to raw response if formatting fails
          return rawResponse;
        }
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  // Update list-contacts tool
  server.addTool({
    name: "list-contacts",
    description:
      "Retrieve all saved contacts including ship identifiers and nicknames",
    parameters: z
      .object({
        format: z
          .enum(["raw", "formatted"])
          .default("formatted")
          .describe(
            "Format of returned data: 'raw' for original JSON, 'formatted' for user-friendly structure"
          ),
      })
      .strict(),
    execute: async (params) => {
      try {
        const rawContacts = await getContacts(api);

        // Return formatted or raw data based on parameter
        const responseData =
          params.format === "raw" ? rawContacts : formatContacts(rawContacts);

        return createJsonResponse(responseData);
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  // Groups
  server.addTool({
    name: "list-groups",
    description: "List all groups the user is a member of",
    parameters: z.object({}).strict(),
    execute: async () => {
      try {
        await ensureConnected(api);
        const groups = await listGroups(api);
        return createJsonResponse(groups);
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "get-group-info",
    description: "Get detailed information about a group",
    parameters: z
      .object({
        group: z.string().describe("Group flag (~host/slug)"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        const info = await getGroupInfo(api, params.group);
        return createJsonResponse(info);
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "list-group-members",
    description: "List members of a group with their roles",
    parameters: z
      .object({
        group: z.string().describe("Group flag (~host/slug)"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        const members = await listGroupMembers(api, params.group);
        return createJsonResponse(members);
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "invite-to-group",
    description: "Invite ships to a group",
    parameters: z
      .object({
        group: z.string().describe("Group flag (~host/slug)"),
        ships: z
          .array(z.string())
          .min(1)
          .describe("Ships to invite (with ~)"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        await inviteToGroup(api, params.group, params.ships);
        return createJsonResponse({ ok: true });
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "assign-role",
    description: "Assign a role to a member in a group",
    parameters: z
      .object({
        group: z.string().describe("Group flag (~host/slug)"),
        ship: z.string().describe("Ship to assign role to (with ~)"),
        role: z.string().describe("Role ID to assign"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        await assignRole(api, params.group, params.ship, params.role);
        return createJsonResponse({ ok: true });
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "remove-role",
    description: "Remove a role from a member in a group",
    parameters: z
      .object({
        group: z.string().describe("Group flag (~host/slug)"),
        ship: z.string().describe("Ship to remove role from (with ~)"),
        role: z.string().describe("Role ID to remove"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        await removeRole(api, params.group, params.ship, params.role);
        return createJsonResponse({ ok: true });
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "create-group",
    description: "Create a new group",
    parameters: z
      .object({
        name: z.string().describe("Group name (used for slug and title)"),
        title: z.string().optional().describe("Display title (defaults to name)"),
        description: z.string().optional().describe("Group description"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        const result = await createGroup(
          api,
          shipName,
          params.name,
          params.title,
          params.description
        );
        return createJsonResponse(result);
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  // Channels
  server.addTool({
    name: "list-channels",
    description: "List all channels in a group",
    parameters: z
      .object({
        group: z.string().describe("Group flag (~host/slug)"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        const channels = await listGroupChannels(api, params.group);
        return createJsonResponse(channels);
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "get-channel-info",
    description: "Get info about a specific channel",
    parameters: z
      .object({
        channel: z.string().describe("Channel nest (chat/~host/name)"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        const info = await getChannelInfo(api, params.channel);
        return createJsonResponse(info);
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "read-channel-history",
    description: "Read recent messages from a channel",
    parameters: z
      .object({
        channel: z.string().describe("Channel nest (chat/~host/name)"),
        count: z
          .number()
          .int()
          .positive()
          .max(100)
          .default(50)
          .describe("Number of messages to fetch (default 50)"),
        format: z
          .enum(["raw", "formatted"])
          .default("formatted")
          .describe("Format: raw or formatted"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        const raw = await readChannelHistory(
          api,
          params.channel,
          params.count ?? 50
        );

        if (params.format === "raw") {
          return createJsonResponse(raw);
        }

        const formatted = formatChannelHistory(raw);
        return createJsonResponse({
          meta: {
            channel: params.channel,
            messageCount: formatted.length,
          },
          messages: formatted,
        });
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "create-channel",
    description: "Create a new channel in a group",
    parameters: z
      .object({
        group: z.string().describe("Group flag (~host/slug)"),
        type: z.enum(["chat", "notebook", "gallery"]).describe("Channel type"),
        name: z.string().describe("Channel name (used for slug and title)"),
        title: z.string().optional().describe("Display title (defaults to name)"),
        description: z.string().optional().describe("Channel description"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        const result = await createChannel(
          api,
          params.group,
          params.type,
          params.name,
          params.title,
          params.description
        );
        return createJsonResponse(result);
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "send-to-channel",
    description: "Send a message to a channel",
    parameters: z
      .object({
        channel: z.string().describe("Channel nest (chat/~host/name)"),
        message: z.string().describe("Message text"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        await sendToChannel(api, params.channel, params.message, shipName);
        return createJsonResponse({ ok: true });
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  // Posts and reactions
  server.addTool({
    name: "react-to-post",
    description: "Add a reaction to a post",
    parameters: z
      .object({
        channel: z.string().describe("Channel nest"),
        postId: z.string().describe("Post ID (@ud format)"),
        emoji: z.string().describe("Emoji to react with"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        await reactToPost(api, params.channel, params.postId, params.emoji, shipName);
        return createJsonResponse({ ok: true });
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "unreact-to-post",
    description: "Remove a reaction from a post",
    parameters: z
      .object({
        channel: z.string().describe("Channel nest"),
        postId: z.string().describe("Post ID (@ud format)"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        await unreactToPost(api, params.channel, params.postId, shipName);
        return createJsonResponse({ ok: true });
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "edit-post",
    description: "Edit an existing post in a channel",
    parameters: z
      .object({
        channel: z.string().describe("Channel nest"),
        postId: z.string().describe("Post ID to edit (@ud format)"),
        message: z.string().describe("New message text"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        await editPost(api, params.channel, params.postId, params.message, shipName);
        return createJsonResponse({ ok: true });
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "delete-post",
    description: "Delete a post from a channel",
    parameters: z
      .object({
        channel: z.string().describe("Channel nest"),
        postId: z.string().describe("Post ID to delete"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        await deletePost(api, params.channel, params.postId);
        return createJsonResponse({ ok: true });
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  // Activity
  server.addTool({
    name: "get-activity",
    description: "Get recent activity or notifications",
    parameters: z
      .object({
        type: z.enum(["all", "mentions", "replies"]).default("all"),
        limit: z.number().int().positive().max(25).default(10),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        const activity = await getActivity(api, params.type, params.limit);
        return createJsonResponse(activity);
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "get-unreads",
    description: "Get unread counts per channel",
    parameters: z.object({}).strict(),
    execute: async () => {
      try {
        await ensureConnected(api);
        const unreads = await getUnreads(api);
        return createJsonResponse(unreads);
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  // Profiles
  server.addTool({
    name: "get-profile",
    description: "Get a ship's profile",
    parameters: z
      .object({
        ship: z.string().describe("Ship name (with ~)"),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        const profile = await getProfile(api, params.ship);
        return createJsonResponse(profile);
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "update-profile",
    description: "Update your own profile",
    parameters: z
      .object({
        nickname: z.string().optional(),
        bio: z.string().optional(),
        status: z.string().optional(),
        avatar: z.string().url().optional(),
        cover: z.string().url().optional(),
      })
      .strict(),
    execute: async (params) => {
      try {
        await ensureConnected(api);
        const fields = {};
        if (params.nickname) fields.nickname = params.nickname;
        if (params.bio) fields.bio = params.bio;
        if (params.status) fields.status = params.status;
        if (params.avatar) fields.avatar = params.avatar;
        if (params.cover) fields.cover = params.cover;

        if (Object.keys(fields).length === 0) {
          return createErrorResponse(new Error("No profile fields provided"));
        }

        await updateProfile(api, fields);
        return createJsonResponse({ ok: true });
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  server.addTool({
    name: "get-my-profile",
    description: "Get your own profile information",
    parameters: z.object({}).strict(),
    execute: async () => {
      try {
        await ensureConnected(api);
        const profile = await api.scry({ app: "contacts", path: "/self" });
        return createJsonResponse(profile);
      } catch (error) {
        return createErrorResponse(error);
      }
    },
  });

  // Start the server with a basic default configuration
  // Use HTTP transport only if explicitly requested, otherwise default to stdio
  const useHttp = process.env.MCP_TRANSPORT === "http";
  const port = parseInt(process.env.PORT || "3001");

  try {
    if (useHttp) {
      // Set up SSE transport according to the documentation
      await server.start({
        transportType: "sse",
        sse: {
          endpoint: "/sse",
          port,
        },
      });
      console.log(`Tlon MCP server started on port ${port}, endpoint: /sse`);
    } else {
      // Default to stdio with no options
      await server.start({
        transportType: "stdio",
      });
      console.log("Tlon MCP server started in stdio mode");
    }
  } catch (error) {
    console.error("Error starting MCP server:", error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("Shutting down MCP server...");
    try {
      await server.stop();
      await api.delete();
    } catch (e) {
      console.warn("Warning: Failed to clean up resources", e);
    }
    process.exit(0);
  });
}

// Start the MCP server when this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMcpServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

// Export for use as a module in other scripts
export { sendDm, readDmHistory, startMcpServer };
