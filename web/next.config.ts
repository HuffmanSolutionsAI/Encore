import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Album artwork comes from MusicBrainz' Cover Art Archive (proxied through
  // coverartarchive.org → archive.org redirects) and Last.fm's CDN. The API
  // never returns arbitrary host URLs, but we let Next.js know which hosts to
  // allow for `next/image` optimisation.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.coverartarchive.org" },
      { protocol: "https", hostname: "coverartarchive.org" },
      { protocol: "https", hostname: "ia*.us.archive.org" },
      { protocol: "https", hostname: "lastfm.freetls.fastly.net" },
    ],
  },
};

export default config;
