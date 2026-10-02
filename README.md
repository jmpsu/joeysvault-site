# joeysvault-site

Source of truth for the public sites:

- `www.joeysvault.app` — landing page (`src/pages/www.html`)
- `projects.joeysvault.app` — project list with the overview video (`src/pages/projects.html`)

Both are served by one Cloudflare Worker (`src/index.js`). Media is in `public/` and is served with
HTTP range support so video seeks correctly. `scripts/media-sizes.mjs` runs at deploy time and records
file sizes for that.

`joeysvault.app` (bare domain) redirects to `www`. `upload.` and `vllm.` belong to the separate `flue-manager`
Worker and are not in this repository.

## Publishing

`main` is production. Cloudflare Workers Builds deploys every push to `main`; each deploy is a
versioned release that can be rolled back from the Cloudflare dashboard (Workers & Pages → joeysvault-site →
Deployments). Do not run `wrangler deploy` by hand against this Worker.

## Changing the overview video

Replace `public/energy-overview.mp4` and `public/energy-overview.jpg`, bump the `?v=` on the two URLs in
`src/pages/projects.html`, and push. Files must be under 25 MiB each.

No credentials belong in this repository.
