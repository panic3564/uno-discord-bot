# UNO Discord Bot

A feature-rich Discord bot that allows users to play the popular card game **UNO** directly in Discord! Play against AI opponents, challenge your friends, or mix both in games of up to 4 players.

## Features

- ✅ Play UNO with friends in Discord
- ✅ Play against AI opponents with different difficulty levels (Easy, Medium, Hard)
- ✅ Mix of human players and AI bots (up to 4 players total)
- ✅ Support for all UNO special cards (Skip, Reverse, Draw 2, Wild, Wild Draw 4)
- ✅ Automatic turn management
- ✅ Real-time game status updates
- ✅ Easy-to-use slash commands
- ✅ Team mode with alternating teams (A vs B)
- ✅ Teammates can view each other's hands
- ✅ UNO call-out feature with 2-card penalty
- ✅ Docker support with automatic builds

## Setup Guide

### Prerequisites

- **For Node.js**: Node.js 18.0 or higher (recommended: Node.js 20+)
- **For Docker**: Docker and Docker Compose
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

### Step 3: Get Your Bot Credentials

Note down the following from your Discord Developer Portal:
- **Bot Token** (from Step 1)
- **Client ID** (found in the "General Information" tab)
- **Guild ID** (your server ID, optional for testing)

You will need these for the next steps.

---

## Installation Options

Choose one of the following methods to run the bot:

### Option A: Running Directly with Node.js

#### Step 4: Clone the repository

1. Clone this repository or download the files
2. Navigate to the project directory

#### Step 5: Configure the Bot

1. Create a `.env` file by copying the example:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` in a text editor and fill in the required values:
   ```
   DISCORD_TOKEN=your_bot_token_from_step_1
   CLIENT_ID=your_bot_client_id
   GUILD_ID=your_server_id_for_testing
   BOT_NAME=UNO Discord Bot
   BOT_STATUS=Playing UNO with you!
   ```

#### Step 6: Install Dependencies

Run the following command to install the required packages:

```bash
npm install
```

#### Step 7: Start the Bot

Run the bot using:

```bash
npm start
```

For development with auto-restart on file changes:

```bash
npm run dev
```

Your bot should now be online in your Discord server!

---

### Option B: Running with Docker

#### Step 4: Clone the repository

```bash
git clone https://github.com/panic3564/uno-discord-bot.git
cd uno-discord-bot
```

#### Step 5: Configure the bot

1. Create a `.env` file with your configuration:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and add your Discord token and other settings.

#### Step 6: Build and run with Docker Compose

```bash
docker-compose up -d
```

This will:
- Build the Docker image
- Start the container
- Run the bot in detached mode

#### Step 7: View logs

```bash
docker-compose logs -f uno-discord-bot
```

#### Step 8: Stop the bot

```bash
docker-compose down
```

#### Step 9: Update the bot

```bash
docker-compose pull && docker-compose up -d
```

---

### Option C: Using Pre-built Docker Images from GHCR

The bot is automatically built and pushed to GitHub Container Registry (GHCR) on every push to main.

#### Step 4: Pull the latest image

```bash
docker pull ghcr.io/panic3564/uno-discord-bot:main
```

#### Step 5: Run with Docker

```bash
docker run -d \
  --name uno-discord-bot \
  -e DISCORD_TOKEN=your_token_here \
  -e CLIENT_ID=your_client_id \
  -e GUILD_ID=your_guild_id \
  ghcr.io/panic3564/uno-discord-bot:main
```

#### Step 6: Or use docker-compose with pre-built image

Create a `docker-compose.yml` file:

```yaml
services:
  uno-discord-bot:
    image: ghcr.io/panic3564/uno-discord-bot:main
    container_name: uno-discord-bot
    restart: unless-stopped
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - CLIENT_ID=${CLIENT_ID}
      - GUILD_ID=${GUILD_ID}
    volumes:
      - ./logs:/app/logs
```

Then run:

```bash
docker-compose up -d
```

---

## Usage

### Slash Commands

All commands start with `/` and are available in any channel where the bot has permissions.

#### Game Setup Commands

| Command | Description |
|---------|-------------|
| `/uno-start players:<number> [bots:<number>] [difficulty:<easy/medium/hard>] [teams:<true/false>]` | Create a new UNO game with human players and optional AI bots |
| `/uno-join` | Join an existing waiting game |
| `/uno-begin` | Start the game once all players are ready |
| `/uno-addbot count:<number> [difficulty:<easy/medium/hard>]` | Add AI bots to a waiting game |
| `/uno-removebot count:<number>` | Remove AI bots from a waiting game |
| `/uno-status` | Check the current game status |

#### Game Action Commands

| Command | Description |
|---------|-------------|
| `/uno-hand [player:<@teammate>]` | View your current hand or a teammate's hand (in team mode) |
| `/uno-play card-number:<number> [color:<red/blue/green/yellow>]` | Play a card from your hand |
| `/uno-draw` | Draw a card from the deck |
| `/uno` | Say UNO when you have one card left |
| `/uno-calluno player:<@player>` | Call out a player who forgot to say UNO |
| `/uno-info` | Display bot information and license |

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
/uno-start players:2 bots:2 difficulty:hard
```
Creates a game with 2 human players and 2 Hard AI opponents.

#### Starting a Team Game

```
/uno-start players:4 teams:true
```
Creates a 4-player game with alternating teams (A vs B).

#### Adding AI to an Existing Game

```
/uno-addbot count:1 difficulty:easy
```
Adds 1 Easy AI bot to your waiting game.

#### Viewing a Teammate's Hand

```
/uno-hand player:@Charlie
```
In team mode, view your teammate Charlie's hand.

#### Calling Out a Player

```
/uno-calluno player:@Bob
```
Call out Bob for forgetting to say UNO (2-card penalty).

#### Checking Game Status

```
/uno-status
```
Shows the current game state, including players, card counts, teams, and the top card.

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
- If a player forgets to say UNO, the next player can call them out with `/uno-calluno` (2-card penalty)
- First player to get rid of all their cards wins!

## Team Mode

When team mode is enabled:

- Players are automatically assigned to alternating teams (A vs B)
- **Example with 4 players**: Player 1 → Team A, Player 2 → Team B, Player 3 → Team A, Player 4 → Team B
- Teammates can view each other's hands using `/uno-hand player:@teammate`
- Requires an even number of players (minimum 4)
- Teams cannot be adjacent (always separated by opponents)

## AI Difficulty Levels

The AI opponents have different difficulty levels:

- **🟢 Easy**: Plays the first available card
- **🟡 Medium**: Prioritizes special cards and strategic plays
- **🔴 Hard**: Avoids helping opponents, makes smart color choices

Choose the difficulty when starting a game or adding bots:
```
/uno-start players:2 bots:2 difficulty:hard
/uno-addbot count:1 difficulty:easy
```

---

## Troubleshooting

### Bot doesn't come online

- Make sure you've copied the correct token from the Discord Developer Portal
- Check that your `.env` file has the correct values
- Ensure Node.js/Docker is installed and working
- Check the console for error messages

### Commands not showing up

- Wait a few minutes for commands to register globally
- Or specify a `GUILD_ID` in your `.env` file for instant testing in that server
- Make sure the bot has the "Use Slash Commands" permission

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the **Mozilla Public License Version 2.0** - see the [LICENSE](LICENSE) file for details.

---

**Enjoy playing UNO in Discord!** 🎲🃏

Have questions or need help? Open an issue on GitHub!
