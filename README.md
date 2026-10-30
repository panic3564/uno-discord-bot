# UNO Discord Bot

A feature-rich Discord bot that allows users to play the popular card game **UNO** directly in Discord! Play against AI opponents, challenge your friends, or mix both in games of up to 4 players.

## Features

- ✅ Play UNO with friends in Discord
- ✅ Play against AI opponents with different difficulty levels
- ✅ Mix of human players and AI bots (up to 4 players total)
- ✅ Support for all UNO special cards (Skip, Reverse, Draw 2, Wild, Wild Draw 4)
- ✅ Automatic turn management
- ✅ Real-time game status updates
- ✅ Easy-to-use slash commands

## Setup Guide

### Prerequisites

- Node.js 18.0 or higher
- A Discord account
- A Discord server to test the bot

### Step 1: Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click on **"New Application"** and give it a name (e.g., "UNO Bot")
3. Go to the **"Bot"** tab in the left sidebar
4. Click **"Add Bot"** and confirm
5. Under **"Token"**, click **"Copy"** to copy your bot token

### Step 2: Invite the Bot to Your Server

1. Go to the **"OAuth2"** > **"URL Generator"** tab
2. Select **"bot"** and **"applications.commands"** in the Scopes section
3. Under **Bot Permissions**, select:
   - Send Messages
   - View Channels
   - Read Message History
   - Use Slash Commands
   - Add Reactions
4. Copy the generated URL
5. Open the URL in your browser and select your server
6. Authorize the bot to join your server

### Step 3: Configure the Bot

1. Clone this repository or download the files
2. Navigate to the project directory
3. Create a `.env` file by copying the `.env` file:
   ```bash
   cp .env.example .env
   ```
4. Open `.env` in a text editor and fill in the required values:
   ```
   DISCORD_TOKEN=your_bot_token_from_step_1
   CLIENT_ID=your_bot_client_id
   GUILD_ID=your_server_id_for_testing
   PREFIX=!
   BOT_NAME=UNO Discord Bot
   BOT_STATUS=Playing UNO with you!
   ```
   - `DISCORD_TOKEN`: Your bot token from Step 1
   - `CLIENT_ID`: Found in the "General Information" tab of your Discord application
   - `GUILD_ID`: Your server ID (optional, for testing commands in a specific server)
   - `PREFIX`: The prefix for text commands (default: `!`)
   - `BOT_NAME`: Your bot's display name
   - `BOT_STATUS`: The status message shown in Discord

### Step 4: Install Dependencies

Run the following command to install the required packages:

```bash
npm install
```

### Step 5: Start the Bot

Run the bot using:

```bash
npm start
```

For development with auto-restart on file changes:

```bash
npm run dev
```

Your bot should now be online in your Discord server!

## Usage

### Slash Commands

All commands start with `/` and are available in any channel where the bot has permissions.

#### Game Setup Commands

| Command | Description |
|---------|-------------|
| `/uno-start players:<number> [bots:<number>]` | Create a new UNO game with human players and optional AI bots |
| `/uno-join` | Join an existing waiting game |
| `/uno-begin` | Start the game once all players are ready |
| `/uno-addbot count:<number>` | Add AI bots to a waiting game |
| `/uno-removebot count:<number>` | Remove AI bots from a waiting game |
| `/uno-status` | Check the current game status |

#### General Commands

| Command | Description |
|---------|-------------|
| `/ping` | Check if the bot is online |
| `/help` | List all available commands |

### Examples

#### Starting a Game with Friends

```
/uno-start players:4
```
Creates a game for 4 human players. Players can join using `/uno-join`, then start with `/uno-begin`.

#### Starting a Game with AI

```
/uno-start players:2 bots:2
```
Creates a game with 2 human players and 2 AI opponents.

#### Adding AI to an Existing Game

```
/uno-addbot count:1
```
Adds 1 AI bot to your waiting game.

#### Checking Game Status

```
/uno-status
```
Shows the current game state, including players, card counts, and the top card.

## Game Rules

The bot follows standard UNO rules:

- Each player starts with 7 cards
- Players take turns playing cards that match the top card by color, number, or symbol
- Special cards:
  - **Skip**: Next player loses their turn
  - **Reverse**: Changes the direction of play
  - **Draw 2**: Next player draws 2 cards and loses their turn
  - **Wild**: Choose any color (including the current one)
  - **Wild Draw 4**: Choose any color, next player draws 4 cards and loses their turn
- When a player has one card left, they must say "UNO"
- First player to get rid of all their cards wins!

## AI Difficulty Levels

The AI opponents have different difficulty levels:

- **Easy**: Plays the first available card
- **Medium**: Prioritizes special cards and strategic plays
- **Hard**: Avoids helping opponents, makes smart color choices

Currently, all AI bots use Medium difficulty, but this can be customized in the code.

## Project Structure

```
uno-discord-bot/
├── .env                    # Environment variables (create from .env.example)
├── .env.example            # Template for environment variables
├── .gitignore              # Files to ignore in git
├── package.json            # Node.js dependencies and scripts
├── README.md               # This file
├── config/
│   └── config.js           # Bot configuration loader
└── src/
    ├── index.js            # Main bot entry point
    ├── commands/           # Slash commands
    │   ├── help.js         # Help command
    │   ├── ping.js         # Ping command
    │   └── uno/            # UNO game commands
    │       ├── start.js    # Start a new game
    │       ├── join.js     # Join a game
    │       ├── begin.js    # Begin the game
    │       ├── addbot.js   # Add AI bots
    │       ├── removebot.js # Remove AI bots
    │       └── status.js   # Check game status
    ├── events/              # Discord event handlers
    │   ├── ready.js        # Bot ready event
    │   └── interactionCreate.js # Slash command handler
    └── utils/               # Utility functions
        ├── logger.js       # Logging utility
        ├── gameManager.js  # Game state manager
        ├── cardDeck.js     # Card deck utilities
        └── unoBot.js       # AI bot logic
```

## Troubleshooting

### Bot doesn't come online

- Make sure you've copied the correct token from the Discord Developer Portal
- Check that your `.env` file has the correct values
- Ensure Node.js is installed and working
- Check the console for error messages

### Commands not showing up

- Wait a few minutes for commands to register globally
- Or specify a `GUILD_ID` in your `.env` file for instant testing in that server
- Make sure the bot has the "Use Slash Commands" permission

### Bot can't see messages

- Make sure the bot has the "Message Content Intent" enabled in the Discord Developer Portal
- Go to your bot settings and enable "Message Content Intent"

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Enjoy playing UNO in Discord!** 🎲🃏

Have questions or need help? Open an issue on GitHub!
