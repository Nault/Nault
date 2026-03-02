<h1 align="center">Nault Pro</h1>

<h3 align="center">Nano.to's Nault Fork</h3>

<p align="center">
  <img src="https://github.com/fwd/nault/raw/master/.github/screen.png" alt="Nault Promo" />
</p>

Nault Pro is a non-custodial Nano wallet experience that can run fully local, or be self-hosted on Cloudflare for cloud-enabled features.

## Why Nault Pro Cloud (without giving up custody)

- **Non-custodial by design**: your wallet backup is stored as encrypted wallet data, not as plaintext keys.
- **Cloud convenience**: sync profile settings, access cloud-backed wallet data, and use API keys for programmatic actions.
- **Self-hosted control**: run your own Cloudflare Worker + D1 database so you control infrastructure and policy.
- **Local-first still supported**: if you prefer, use Nault Pro as a local wallet with browser storage and no cloud backup.

## Self-hosting on Cloudflare

The repository includes `functions/` for running Nault Pro cloud services through Cloudflare Pages Functions + D1.

1. Create and wire a D1 database binding named `DB` in your Pages project.
2. Apply schema:

```bash
npx wrangler d1 execute nault-pro --file=./functions/schema.sql --remote
```

3. Set required secret:

```bash
npx wrangler pages secret put JWT_SECRET --project-name <your-pages-project>
```

4. (Optional) Set `CORS_ORIGIN` and `RPC_URL` as Pages variables for your environment.
5. Deploy:

```bash
# Deploy static site + functions using your Pages workflow
```

## Changes

- ✅ Redesigned UI/UX
- ✅ Add Nano.to Usernames to send page.
- ✅ Add Nano.to Usernames to transactions.
- ✅ Add seamless OpenAI into Nault
- 🟨 Add Community Funding Page
- 🟨 Add eCommerce into Nault.Pro
- 🟨 Professional Security Audit
- 🟨 Nault.Pro Code Freeze & Formal Release

### License 

**MIT**

## Nano.to Support

- Email: support@nano.to
- Twitter: [@nano2dev](https://twitter.com/nano2dev)
- Mastodon: [Xno.Social](https://xno.social/@nano2dev)
