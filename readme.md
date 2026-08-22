# gh-visualizations

This service design to help me up-to-date with some repos I select

## Initial Design

![design](./docs/design.png)

## Running the server

```bash
pnpm install
cp .env.example .env   # optional, every value has a default
pnpm start             # http://localhost:3000
```

Set `GITHUB_TOKEN` in `.env` before adding more than a repository or two —
unauthenticated GitHub calls are capped at 60 requests/hour.

Migrations under `migrations/` apply automatically on start. A background job
(`SYNC_CRON`, every 5 minutes by default) re-syncs every tracked repository;
set `SYNC_ENABLED=false` to run the API on its own.

## API

All responses are `{ "status": "success", "data": { … } }`; errors are
`{ "errors": [{ "message": …, "field"?: … }] }`.

| Method   | Path                                     | Description                                                                                             |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET`    | `/healthz`                               | Liveness probe.                                                                                         |
| `GET`    | `/api/v1/repositories`                   | Tracked repositories.                                                                                   |
| `POST`   | `/api/v1/repositories`                   | Track a repository. Body: `{owner, name}` or `{url}`. Verifies it against GitHub and runs a first sync. |
| `GET`    | `/api/v1/repositories/:id`               | One repository.                                                                                         |
| `DELETE` | `/api/v1/repositories/:id`               | Stop tracking; cascades to its commits and pull requests.                                               |
| `POST`   | `/api/v1/repositories/:id/sync`          | Sync now, outside the cron schedule.                                                                    |
| `GET`    | `/api/v1/repositories/:id/commits`       | Commits, newest first. `?limit=&offset=`                                                                |
| `GET`    | `/api/v1/repositories/:id/pull-requests` | Pull requests, newest first. `?limit=&offset=`                                                          |
| `GET`    | `/api/v1/repositories/:id/stats`         | Chart data: totals, a dense daily series, per-author breakdowns. `?days=` (default 30)                  |
| `GET`    | `/api/v1/commits`                        | Recent commits across every repository.                                                                 |
| `GET`    | `/api/v1/pull-requests`                  | Recent pull requests across every repository.                                                           |
| `GET`    | `/api/v1/github/users/:username/repos`   | What a GitHub user has available to track (repository picker).                                          |

### Which branch gets synced

`SYNC_BRANCH` (default `develop`), falling back to the repository's own default
branch when it has no such branch. The branch actually read is stored on each
repository as `syncedBranch` and on each commit as `branch`.
