# Buzz Events
This is a Next.js project running multiple events for a YouTuber, Buzz. It have been branched into 5 different parts:
- Artifact: Versionly watcher-submitted ID review.
- Rubgram: A paid event that basically lets Buzz play endgame content for you.
- Tierlist: Versionly tierlist rating characters for Spiral Abyss & Stygian Onslaught.
- `WIP` Admin: Admin panel where you can manage versions, characters, tierlists, external services, etc.

## Architecture
- User Interface: `shadcn`
- Authentication: `better-auth`
- Drag n drop: `dndkit`
- Database: `drizzle` and a Postgres cluster
  - All IDs are UUIDv7
- `BROKEN` EventSource manager for live sync
- Rubgram
  - Payment verification: `SlipOK`
  - Authentication: DIscord OAuth2
- Client side cross components communication with debug menu

## External APIs
- Character&Version data: [Project Amber](https://gi.yatta.moe/en)
- Character Card: [Enka.network](https://enka.network/)

## Developers
Lead Developer: `@dmgnr`

Project Coordinator: `@gunshiz`

Consultant Developer: `@s4msh1ne`