# SWU Base

## Prerequisities
1. Docker installed (used only for local DB, but you can use something else)
2. bun installed

### Start database (postgres in docker):
1. `docker pull postgres:16-alpine`
2. `docker run -d --name swubase-postgres -e POSTGRES_PASSWORD=password -p 5442:5432 postgres:16-alpine`


### Create .env file
Currently it is possible to sign in only using github / google, so you will need cliend id/secrets for at least one of them, even in development: 
```env
DATABASE_URL=postgresql://postgres:password@localhost:5442/postgres
BETTER_AUTH_SECRET=___random_string
BETTER_AUTH_URL=http://localhost:5173
VITE_BETTER_AUTH_URL=http://localhost:5173
GITHUB_CLIENT_ID=client_id_from_your_github_app
GITHUB_CLIENT_SECRET=client_secret_from_your_github_app
GOOGLE_CLIENT_ID=client_id_from_your_google_app
GOOGLE_CLIENT_SECRET=client_secret_from_your_google_app
```

_TODO: provide localhost callback URLS for github/google_


To run server:
1. `bun install`
2. `bun dev`

To run frontend, go to `/frontend` and do the same:
1. `bun install`
2. `bun dev`
