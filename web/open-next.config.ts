// OpenNext config for Cloudflare Workers.
// See https://opennext.js.org/cloudflare for full option reference.
//
// "dummy" values disable ISR/tag-based caching and use direct queue
// processing -- correct defaults for an MVP with no ISR/on-demand
// revalidation requirements yet. Revisit if/when calendar page caching
// (e.g. daily panchang) needs real incremental cache backing (KV, R2, etc).
export default {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "direct",
    },
  },
};
