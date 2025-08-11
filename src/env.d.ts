type Runtime = import("@astrojs/cloudflare").Runtime<Env>;
interface Env {
  MEDIA: R2Bucket;
}

declare namespace App {
  interface Locals extends Runtime {}
}
