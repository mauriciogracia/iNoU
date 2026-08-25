# Social Network CRUD and Broadcast Configuration

- id: 0004
- status: done
- completedAt: 2026-08-14
- owner: iNoU Team
- source: user request

## What Changed

Added configurable social network profiles and integrated them with broadcast defaults.

New command family:

- `sn add <network> <configurationName> [--account <handle>] [--enabled yes|no]`
- `sn list`
- `sn update <configurationName> [--network <network>] [--account <handle>] [--enabled yes|no]`
- `sn remove <configurationName>`

Supported networks:

- instagram
- tiktok
- facebook
- linkedin

Integration behavior:

- `social broadcast` now uses enabled `sn` profiles as default targets when `--platforms` is omitted.
- Broadcast simulation supports Instagram and TikTok in addition to existing channels.

## Validation

- [x] TypeScript build passed
- [x] sn command tests passed
- [x] command dispatcher tests passed
- [x] social broadcast tests passed
