import { syncAll } from "@/lib/sync";
import { handle, HttpError } from "@/lib/server";

// for vercel cron / any scheduler. set CRON_SECRET and send it as a bearer token
export const maxDuration = 300;
export const GET = handle(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) throw new HttpError(401, "nope");
  return syncAll(new URL(req.url).searchParams.has("force"));
});
