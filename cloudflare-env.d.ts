declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BRIDGE_INITIAL_ADMIN_EMAIL?: string;
    BRIDGE_CF_TURN_KEY_ID?: string;
    BRIDGE_CF_TURN_API_TOKEN?: string;
    BRIDGE_TURN_URLS?: string;
    BRIDGE_TURN_SHARED_SECRET?: string;
    BUCKET?: R2Bucket;
  }
}
