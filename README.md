# NRSS - RSS feeds for NRK's podcasts

Live version: [nrss.deno.dev](https://nrss.deno.dev/)

A webapp built with Deno's [Fresh](https://fresh.deno.dev/) that generates
public accessible RSS-feeds for their produced podcasts via their
[API](https://psapi.nrk.no/documentation/).

This is a backup of the original [NRSS](https://nrss.deno.dev/)
([source](https://github.com/olaven/NRSS)). It serves only the RSS feeds — the
donation features have been removed.

## Local development

1. [Install Deno](https://deno.land/manual/getting_started/installation)
1. Run the app: `deno task start`
1. Open [localhost:8000](http://localhost:8000) in your browser

The app needs no environment variables to run.

## Self-hosting

The app deploys to [Deno Deploy](https://deno.com/deploy). To run your own copy:

1. Fork this repo and create an app from it in the Deno Deploy console (Fresh is
   auto-detected; build command `deno task build`, entrypoint `main.ts`).
1. Set `HOST_URL` to your app's production URL (e.g.
   `https://<app>.<org>.deno.net`). This URL is embedded in each feed's
   `podcast:chapters` links, so it must match where the app is served.
1. Deno KV is provisioned automatically; no database setup is required.

## What is this?

This is made as a reaction that the goverment funded NRK is closing their own
content to their own app instead of building under open standards like RSS.

## Known Problems

- Some clients may not accept a feed hosted over HTTPS only. See @steinarb's workaround [here](https://github.com/olaven/NRSS/issues/5#issuecomment-1488840679) for a possible solution.
- The feeds only provide the latest episodes for a podcast, not the entire archive. I've not yet found any acceptable method of fetching all episodes without getting rate limited by NRK or introducing a storage layer. This is tracked in https://github.com/olaven/NRSS/issues/8.
