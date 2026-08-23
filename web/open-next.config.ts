// Minimal OpenNext config for Cloudflare Workers.
// See https://opennext.js.org/cloudflare for options (ISR, caching, etc.)
export default {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
    },
  },
};
