// tic-dispatch: The Intelligence Company's dispatch clock (Cloudflare Worker). The logic and the JOBS list are in
// dispatch.js.
//
// No cron and no public URL. PropertyCast's trigger Worker calls tick() every 5 minutes through its service binding
// DISPATCH (PropertyCast/trigger/wrangler.toml); nothing else can reach it. scheduled() is here so a cron can be
// added later without code changes, if a cron slot frees up.
//
// Deployed by .github/workflows/dispatch-deploy.yml. One secret, DISPATCH_TOKEN: a fine-grained GitHub token with
// Actions: read and write on the JOBS repos only.
import { WorkerEntrypoint } from "cloudflare:workers";
import { run } from "./dispatch.js";

export default class TicDispatch extends WorkerEntrypoint {
  // when: the caller's cron slot, in epoch milliseconds. Returns the repos started; throws if any start failed.
  async tick(when) {
    return run(this.env, new Date(when));
  }

  async scheduled(controller) {
    await run(this.env, new Date(controller.scheduledTime));
  }
}
