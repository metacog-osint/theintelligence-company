// tic-dispatch: The Intelligence Company's dispatch clock (Cloudflare Worker). The logic and the JOBS list are in
// dispatch.js.
//
// Its own cron, every 5 minutes (wrangler.toml), since 14 Nov 2026, and no public URL. Before that PropertyCast's
// trigger Worker called tick() through a service binding; that binding is gone, so nothing calls tick() now. It stays
// as a fallback clock entry, but never bind it while the cron runs: every job would start twice.
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
