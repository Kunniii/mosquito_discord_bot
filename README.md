# 🦟 Mosquito Discord Bot

<p align="center">
  <b>A hilarious Discord bot simulating persistent mosquito buzzing in voice channels, built with multi-guild isolation and Node.js v24+ Native TypeScript execution.</b>
</p>

---

## ✨ Features

- **🌐 Multi-Guild Scalability:**
  - Full server-level state isolation (`Map<guildId, MosquitoInstance>`).
  - Supports multiple Discord servers concurrently without cross-talk or race conditions.
- **🦟 Mosquito Buzzing Service (`/spawn`):**
  - **Dynamic Timer:** Spawns randomly into targeted voice channels between 1 and 15 minutes.
  - **Smart Channel Sensing:** Checks if channels have active non-bot listeners before joining. Reschedules if empty.
  - **Looping Voice Audio:** Plays high-pitch mosquito audio on repeat using `@discordjs/voice`.
- **👏 Slap / Hit Mosquito Mechanic:**
  - Mentioning the bot with slap keywords (`slap`, `dap`, `đập`, `hit`, `kill`, `👏`, `cmm`, ...) immediately squashes the mosquito, disconnecting it and triggering a respawn timer.
- **👢 Voice Moderation (`/vckick`):**
  - Allows moderators with `Move Members` permission to kick problematic users out of voice channels.
  - Full permission and Role Hierarchy safety checks (cannot kick higher/equal roles).
- **⚡ Native TypeScript on Node.js v24+:**
  - Zero build steps, zero bundling, no ts-node, and migrated off Bun.
  - Direct TypeScript execution via Node 24 native Type Stripping.

---

## 📋 Slash Commands

| Command | Description | Required Permissions |
| :--- | :--- | :--- |
| `/spawn on <kênh_thoại>` | Activate mosquito spawn service for the specified voice channel | Server Member |
| `/spawn off` | Deactivate mosquito service and immediately disconnect voice | Server Member |
| `/vckick <target> [reason]` | Kick a user from their active voice channel | `Move Members` (User & Bot) |
| `/ping` | Check Bot interaction latency | None |

---

## 🛠️ Prerequisites

- **Node.js:** v24.0.0 or higher
- **NPM:** v10.0.0 or higher

---

## 🚀 Installation & Setup

### 1. Clone repository
```bash
git clone https://github.com/Kunniii/mosquito_discord_bot.git
cd mosquito_discord_bot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment configuration
Create a `.env` file from `.env.example`:
```env
TOKEN=your_discord_bot_token
APP_ID=your_discord_application_id
```

### 4. Deploy Slash Commands
Register commands with the Discord API:
```bash
npm run deploy
```

### 5. Start the bot
```bash
npm run server
# or deploy + start together:
npm start
```

### 6. Type Check
Verify types with TypeScript compiler:
```bash
npm run typecheck
```

---

## 🏗️ Architecture Overview

```text
src/
├── commands/
│   ├── ping.ts              # Latency check command
│   ├── spawn.ts             # Mosquito control slash command
│   └── vckick.ts            # Voice moderation kick command
├── managers/
│   ├── GuildMosquitoManager.ts # Multi-guild registry & coordinator
│   └── MosquitoInstance.ts     # Per-guild mosquito audio/timer state
├── utils/
│   └── logger.ts            # Structured guild-prefixed logger
├── deploy-command.ts        # Slash command deploy script
└── index.ts                 # Main Discord Client entrypoint
```

---

## 📄 License

ISC License. Built for fun and server entertainment.
