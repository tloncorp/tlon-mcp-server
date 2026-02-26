# Tlon MCP Server

An MCP (Model Context Protocol) server that provides tools for interacting with Tlon agents.

## Demo

https://github.com/user-attachments/assets/765847b2-df40-44c0-bfd3-c23eb609bbd8

## Features

- **send-dm tool**: Send direct messages to other users by ship ID or nickname
- **read-dm-history tool**: Retrieve recent messages from a direct-message channel
- **list-contacts tool**: Get contacts with their nicknames and ship IDs
- **groups & channels**: List groups, channels, members, and read channel history
- **posting & reactions**: Send channel messages, react to posts, delete posts
- **activity**: Fetch mentions/replies and unread counts
- **profiles**: Get and update contact profiles
- **Natural language support**: Reference people by their nicknames ("Send a message to Brian")

## Prerequisites

- Node.js (v16+)
- A running Urbit ship

## Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

**Important:** Always run `npm install` manually in the terminal before using with Claude Desktop or any other MCP client. This prevents installation output from interfering with the MCP protocol.

## Configuration

Configure the server using environment variables:

| Variable        | Description                      | Default                     |
| --------------- | -------------------------------- | --------------------------- |
| `URBIT_URL`     | Full Urbit URL (preferred)       | —                           |
| `URBIT_SHIP`    | Your Urbit ship name (without ~) | zod                         |
| `URBIT_CODE`    | Your Urbit +code                 | lidlut-tabwed-pillex-ridrup |
| `URBIT_HOST`    | Urbit host                       | localhost                   |
| `URBIT_PORT`    | Urbit port                       | 8080                        |
| `PORT`          | MCP server port (HTTP mode only) | 3001                        |
| `MCP_TRANSPORT` | Transport type (http or stdio)   | stdio                       |

## Usage

### Starting the server

```bash
# Start with default stdio transport
npm start

# Start with HTTP transport
export MCP_TRANSPORT=http && npm start

# Development mode with auto-reload
npm run dev
```

### Setting up with Claude Desktop

The default stdio mode works seamlessly with Claude Desktop. Create or edit the Claude Desktop configuration file at:

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

With the following content:

```json
{
  "mcpServers": {
    "tlon-mcp": {
      "command": "/bin/sh",
      "args": ["-c", "cd /path/to/server && node index.js"]
    }
  }
}
```

**Important:** Be sure to run `npm install` in the server directory first before configuring Claude Desktop.

### Using the tools with natural language

Once configured, you can use natural language commands:

```
Send a message to Brian
```

```
Show me my recent DM history with ~sampel-palnet
```

```
Who are my contacts?
```

## Available Tools

### send-dm

Sends a direct message to another ship.

Parameters:

- `recipient`: The recipient's ship name (with ~) or nickname
- `message`: The message text to send

Example usage:

```
Send a message to Brian saying "Let's meet tomorrow"
```

### read-dm-history

Fetches the latest messages from a direct-message channel between your ship and another.

Parameters:

- `correspondent`: The other ship's name (with ~) or nickname
- `count` (optional): How many messages to return (default 100, max 500)
- `format` (optional): Output format - "raw" or "formatted" (default "formatted")

Example usage:

```
Show me my last 50 messages with Dad
```

### list-contacts

Retrieves your contacts list with ship IDs and nicknames.

Parameters:

- `format` (optional): Output format - "raw" or "formatted" (default "formatted")

Example usage:

```
List all my contacts
```

### create-group

Create a new group. Accepts a name, optional title, and optional description.

### list-groups

Lists groups you belong to.

### get-group-info

Get detailed info for a group.

### list-group-members

List group members and roles.

### invite-to-group

Invite ships to a group.

### assign-role

Assign a role to a group member.

### remove-role

Remove a role from a group member.

### create-channel

Create a new channel in a group. Specify the group, type (chat, notebook, or gallery), and name.

### list-channels

List all channels in a group.

### get-channel-info

Get metadata about a channel.

### read-channel-history

Fetch recent posts from a channel (raw or formatted).

### send-to-channel

Post a message into a channel.

### react-to-post

Add a reaction to a post.

### unreact-to-post

Remove your reaction from a post.

### edit-post

Edit an existing post's content.

### delete-post

Delete a post by ID.

### get-activity

Fetch recent activity items (all, mentions, replies).

### get-unreads

Get unread counts by channel.

### get-profile

Fetch a ship profile.

### get-my-profile

Get your own profile information.

### update-profile

Update your profile fields (nickname, bio, status, avatar, cover).

## License

MIT
