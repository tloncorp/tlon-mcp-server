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

Creates a new group owned by your ship.

Parameters:

- `name`: Group name (auto-slugified for the URL)
- `title` (optional): Display title (defaults to name)
- `description` (optional): Group description

Example usage:

```
Create a group called "Weekend Projects"
```

### list-groups

Lists all groups you are a member of.

Example usage:

```
What groups am I in?
```

### get-group-info

Get detailed information about a specific group including metadata, channels, and member count.

Parameters:

- `group`: Group flag (e.g., `~sampel-palnet/weekend-projects`)

Example usage:

```
Tell me about the group ~bolbex-fogdys/my-group
```

### list-group-members

List all members of a group with their roles.

Parameters:

- `group`: Group flag (e.g., `~sampel-palnet/weekend-projects`)

Example usage:

```
Who's in the Weekend Projects group?
```

### invite-to-group

Invite one or more ships to a group.

Parameters:

- `group`: Group flag (e.g., `~sampel-palnet/weekend-projects`)
- `ships`: Array of ship names to invite (with ~)

Example usage:

```
Invite ~zod and ~bus to my Weekend Projects group
```

### assign-role

Assign a role to a member in a group.

Parameters:

- `group`: Group flag
- `ship`: Ship to assign role to (with ~)
- `role`: Role ID to assign

### remove-role

Remove a role from a member in a group.

Parameters:

- `group`: Group flag
- `ship`: Ship to remove role from (with ~)
- `role`: Role ID to remove

### create-channel

Creates a new channel in an existing group.

Parameters:

- `group`: Group flag (e.g., `~sampel-palnet/weekend-projects`)
- `type`: Channel type — `chat`, `notebook`, or `gallery`
- `name`: Channel name (auto-slugified for the URL)
- `title` (optional): Display title (defaults to name)
- `description` (optional): Channel description

Example usage:

```
Create a chat channel called "general" in my Weekend Projects group
```

```
Add a notebook called "dev-log" to ~bolbex-fogdys/my-group
```

```
Create a gallery channel called "screenshots" in ~sampel-palnet/weekend-projects
```

### list-channels

List all channels in a group.

Parameters:

- `group`: Group flag (e.g., `~sampel-palnet/weekend-projects`)

Example usage:

```
What channels are in the Weekend Projects group?
```

### get-channel-info

Get metadata about a specific channel.

Parameters:

- `channel`: Channel nest (e.g., `chat/~sampel-palnet/general`)

### read-channel-history

Fetch recent messages from a channel.

Parameters:

- `channel`: Channel nest (e.g., `chat/~sampel-palnet/general`)
- `count` (optional): Number of messages to fetch (default 50, max 100)
- `format` (optional): Output format — "raw" or "formatted" (default "formatted")

Example usage:

```
Show me the last 20 messages in chat/~bolbex-fogdys/general
```

### send-to-channel

Send a message to a channel.

Parameters:

- `channel`: Channel nest (e.g., `chat/~sampel-palnet/general`)
- `message`: Message text to send

Example usage:

```
Send "hello everyone" to chat/~bolbex-fogdys/general
```

### react-to-post

Add an emoji reaction to a post.

Parameters:

- `channel`: Channel nest
- `postId`: Post ID (@ud format with dots)
- `emoji`: Emoji to react with

### unreact-to-post

Remove your reaction from a post.

Parameters:

- `channel`: Channel nest
- `postId`: Post ID (@ud format with dots)

### edit-post

Edit an existing post's content.

Parameters:

- `channel`: Channel nest
- `postId`: Post ID to edit (@ud format with dots)
- `message`: New message text

### delete-post

Delete a post from a channel.

Parameters:

- `channel`: Channel nest
- `postId`: Post ID to delete

### get-activity

Fetch recent activity and notifications.

Parameters:

- `type` (optional): Filter by type — "all", "mentions", or "replies" (default "all")
- `limit` (optional): Number of items (default 10, max 25)

Example usage:

```
Show me my recent mentions
```

### get-unreads

Get unread message counts across all channels.

Example usage:

```
Do I have any unread messages?
```

### get-profile

Fetch another ship's profile information.

Parameters:

- `ship`: Ship name (with ~)

Example usage:

```
What's ~zod's profile?
```

### get-my-profile

Get your own profile information.

Example usage:

```
Show me my profile
```

### update-profile

Update your own profile fields.

Parameters:

- `nickname` (optional): Display name
- `bio` (optional): Bio/description
- `status` (optional): Status message
- `avatar` (optional): Avatar image URL
- `cover` (optional): Cover image URL

Example usage:

```
Set my nickname to "Captain Urbit"
```

## License

MIT
