# Deploying Klid

Two paths. Pick one. Both start the same: get the repo on GitHub.

```bash
cd /Users/pavel/Desktop/Klid
git init
git add .
git commit -m "Initial commit"
# Create a new repo on github.com, then:
git remote add origin git@github.com:<you>/klid.git
git branch -M main
git push -u origin main
```

---

## Shared setup (do this once, regardless of which deploy path)

These steps create the database, schema, and email sender. Done once per project, not per deploy.

### 1. Cloudflare account + API token

- Sign up / log in at dash.cloudflare.com.
- My Profile → API Tokens → Create Token → use the **"Edit Cloudflare Workers"** template. Save the token somewhere safe — you'll need it in a minute.
- Note your **Account ID** (right sidebar of any Workers page).

### 2. Create the D1 database

```bash
npx wrangler login                  # one-time browser auth
npx wrangler d1 create klid
```

Wrangler prints something like:
```
[[d1_databases]]
binding = "DB"
database_name = "klid"
database_id = "12345678-aaaa-bbbb-cccc-deadbeef1234"
```

Paste the `database_id` (and rename `database_name` to `klid` if it's still `klid-dev`) into **both** files:
- `wrangler.toml`
- `wrangler.cron.toml`

### 3. Apply the schema

```bash
npx wrangler d1 execute klid --remote --file=migrations/0001_initial.sql
```

### 4. Resend account + API key

- Sign up at resend.com (free 3K emails/month).
- For the first deploy you can use the sandbox sender `onboarding@resend.dev` — but it will only send to addresses you've verified in the Resend dashboard.
- For real launch: add and verify your domain, then change `EMAIL_FROM` in `wrangler.toml` and `wrangler.cron.toml` to `Klid <hello@your-domain>`.
- Copy your API key (`re_xxx`).

### 5. Generate a JWT secret

```bash
openssl rand -base64 32
```
Copy the output. You'll paste it as `JWT_SECRET` in the next section.

---

## Option A — Cloudflare Workers Builds (dashboard)

**What it is**: Cloudflare connects to your GitHub repo, runs the build on their infrastructure, deploys on every push to `main`. Zero CI config in the repo.

### A1. Connect the main app

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository**.
2. Authorize Cloudflare's GitHub app, pick the `klid` repo.
3. Project name: `klid`.
4. Build configuration:
   - **Build command**: `npm run cf:build`
   - **Deploy command**: `npx wrangler deploy`
   - **Root directory**: leave empty
5. Click **Save and Deploy**. First build runs.

### A2. Bind the D1 database

After the first deploy, in the worker:
1. **Settings** → **Bindings** → **Add** → **D1 Database**.
2. Variable name: `DB`. Database: `klid`. Save.

### A3. Set the secrets

In the worker → **Settings** → **Variables and Secrets** → **Add variable**, set type to **Secret**:
- `JWT_SECRET` = (the openssl output from shared step 5)
- `RESEND_API_KEY` = your `re_xxx`

Save. Trigger a redeploy (push a trivial commit, or **Deployments** → **Retry**).

### A4. Repeat for the cron worker

1. **Workers & Pages** → **Create** → **Import a repository** → same repo.
2. Project name: `klid-reminder-cron`.
3. Build configuration:
   - **Build command**: leave empty
   - **Deploy command**: `npx wrangler deploy --config wrangler.cron.toml`
4. Bindings: add D1 binding `DB` pointing to `klid`.
5. Secrets: `RESEND_API_KEY` (same value as the main app).
6. **Triggers** → confirm the cron `*/5 * * * *` from `wrangler.cron.toml` is active.

Done. From now on, every `git push origin main` redeploys both workers.

---

## Option B — GitHub Actions

**What it is**: The workflow file `.github/workflows/deploy.yml` (already in the repo) runs on every push to `main`. It builds locally on GitHub's runner and uses Cloudflare's API to deploy.

### B1. Add Cloudflare credentials to GitHub

In your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

- `CLOUDFLARE_API_TOKEN` = the token from shared step 1
- `CLOUDFLARE_ACCOUNT_ID` = your account ID

### B2. Add the runtime secrets to Cloudflare

The Actions workflow only deploys code — it doesn't touch secrets. You set those directly on the worker, once:

```bash
npx wrangler secret put JWT_SECRET          # paste the openssl output
npx wrangler secret put RESEND_API_KEY      # paste your re_xxx

npx wrangler secret put JWT_SECRET     --config wrangler.cron.toml
npx wrangler secret put RESEND_API_KEY --config wrangler.cron.toml
```

(Or set them in the Cloudflare dashboard the same way as A3.)

### B3. Push

```bash
git push origin main
```

Watch the Actions tab. First run takes ~2-3 minutes. The job deploys the main app and the cron worker in sequence.

---

## Verifying the deploy

Whichever option you picked, after the first successful deploy:

1. Cloudflare dashboard → your worker → **Deployments** → click the latest. There's a `*.workers.dev` URL.
2. Open it. The landing page should render in Czech.
3. Update `NEXT_PUBLIC_APP_URL` in `wrangler.toml` to this URL (it's used in magic-link and reminder emails). Commit + push to redeploy.
4. Sign up flow: `/auth` → enter your email → check inbox for the link → click → land on `/onboarding`.
5. Force-fire the cron once to confirm it's wired:
   ```bash
   npx wrangler cron trigger klid-reminder-cron --config wrangler.cron.toml
   ```

## (Optional) Custom domain

Cloudflare dashboard → main worker → **Settings** → **Triggers** → **Custom Domains** → Add `klid.app` (or whatever you own). Cloudflare configures DNS + SSL automatically. Then update `NEXT_PUBLIC_APP_URL` to the new domain and redeploy.

## Live debugging

```bash
npx wrangler tail                              # main app live logs
npx wrangler tail --config wrangler.cron.toml  # cron worker live logs
```

## Costs

All zero at low volume:
- Workers: 100K requests/day free
- D1: 5M reads + 100K writes/day free
- Resend: 3K emails/month free
- Jitsi: unlimited free
