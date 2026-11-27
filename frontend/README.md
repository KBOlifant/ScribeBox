# ScribeBox app

This folder is the ScribeBox Next.js 16 app: the pages, the REST API under `app/api/`, and the meeting analysis under `lib/server/decision/`.

Setup, environment variables, how the analysis works, the API and the tests are all in the [root README](../README.md).

Quick start, once `.env` and `certs/aiven-ca.pem` are in place:

```bash
npm install
npm run db:migrate
npm run dev
```

Then open http://localhost:3000.
