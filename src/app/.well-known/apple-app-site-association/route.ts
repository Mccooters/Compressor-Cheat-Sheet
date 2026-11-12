/**
 * Apple App Site Association — the server half of iOS Universal Links.
 *
 * Without this file, scanning an equipment QR sticker opens Safari instead
 * of the Air Assist app. Apple (and its CDN) fetch it from
 * https://<domain>/.well-known/apple-app-site-association, and it is
 * unforgiving about how it is served:
 *
 *   - must be HTTPS, status 200, content type application/json
 *   - must have NO file extension in the path
 *   - must NOT redirect — a 302 to /login is an outright rejection, which is
 *     why /.well-known/ is public in src/proxy.ts
 *   - must NOT require authentication
 *
 * None of those failures are loud. The only symptom is links quietly
 * continuing to open in the browser.
 */

export const dynamic = "force-static";

// Team ID + bundle identifier of the iOS app.
const APP_ID = "M59BYG95U4.com.airassist.workphotos";

const ASSOCIATION = {
  applinks: {
    details: [
      {
        appIDs: [APP_ID],
        components: [
          {
            "/": "/a/*",
            comment: "Equipment asset tag QR codes",
            // REQUIRED. The stickers encode the URL entirely in uppercase
            // (/A/AAC-CMP-0001) so the QR uses alphanumeric mode, which is
            // denser and prints a smaller code. Apple matches these patterns
            // case-sensitively by default, so without this the pattern above
            // would never match what is actually printed on the tags, and
            // the link would silently fall through to Safari.
            caseSensitive: false,
          },
        ],
      },
    ],
  },
};

export async function GET() {
  return Response.json(ASSOCIATION, {
    headers: {
      "content-type": "application/json",
      // Apple's CDN caches this for up to ~24h regardless; an hour here
      // keeps direct fetches cheap without making changes hard to roll out.
      "cache-control": "public, max-age=3600",
    },
  });
}
