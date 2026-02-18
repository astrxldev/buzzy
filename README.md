# Buzz Events
This is a Next.js project running multiple events for a YouTuber, Buzz. It have been branched into 5 different parts:
- Artifact: Monthly watcher-submitted ID review
- Tierlist: Versionly tierlist for best characters for Abyss & Stygian
- Rubgram: A paid event that basically lets Buzz play Abyss/Imaginarium Theater/Stygian for you.
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

## Developers
Lead Developer: `@dmgnr`

Project Coordinator: `@gunshiz`

Consultant Developer: `@s4msh1ne`