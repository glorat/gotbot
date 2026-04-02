# AGENTS.md - AI Agent Guidelines for gotbot

## Project Overview

Discord bot for Star Trek Timelines game community providing crew statistics, mission analytics, gauntlet calculators, voyage estimators, and fleet management.

**Stack**: TypeScript, Node.js 12+, pnpm, discord.js v14, Vitest, NeDB

## Architecture

### Core Entry Points

- `lib/index.ts` - Bot initialization, Discord event handlers
- `lib/cli.ts` - Command parsing and execution
- `lib/webserver.ts` - Express web interface
- `lib/datacore.ts` - Game data management

### Command System (Clapp Framework)

- `lib/modules/clapp/` - Core command framework
- `lib/modules/clapp-discord/` - Discord.js integration
- `lib/commands/` - Command implementations
- Commands registered in `lib/cli.ts` and `lib/index.ts` for slash commands

### Key Interfaces (`lib/Interfaces.ts`)

- **Context** - Discord integration (emojify, boldify, fleetId, author, bot, channel, guild, isEntitled)
- **ClappArgs** - Command arguments and flags
- **CrewAvatar** - Game crew data model
- **FleetDoc** - Fleet configuration

## Development Patterns

### Command Handler Signature

```typescript
async (argv: ClappArgs, context: Context): Promise<string>
```

Returns string response or 'EMBED' for embedded messages.

### Adding a New Command

1. Create file in `lib/commands/` exporting Clapp Command object
2. Register in `lib/cli.ts` command registry
3. Add Discord slash command registration in `lib/index.ts` if needed
4. Write tests in `test/`

### Message Handling

- Traditional messages via `messageCreate` event
- Slash commands via `InteractionCreate` event
- Both routed through same command handler

## Code Standards

- TypeScript strict mode, no implicit `any`
- ESM modules with `.js` extensions in imports
- Prettier (2-space indent), ESLint (xo-space)
- Run `pnpm typecheck` and `pnpm format` before committing

## Key Commands

- `pnpm bot` - Run bot
- `pnpm test` / `pnpm test-watch` - Testing
- `pnpm typecheck` - Type checking
- `pnpm format` - Format code
- `pnpm dlwiki` - Download wiki data (./gotcron)

## Important Notes

- NeDB for local storage, crew data cached from game API
- Winston loggers per channel in `data/logs/`
- Longjohn enabled for async stack traces in non-production
- Privileged intents required: GUILD_MEMBERS, MessageContent
- Bot token in `config.ts` (not in git)
