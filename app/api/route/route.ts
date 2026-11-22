import { sql } from "@/lib/db";
import { handle, HttpError } from "@/lib/server";
import { planRoute, addLivePredictions } from "@/lib/mbta";

export const GET = handle(async (req: Request) => {
  const u = new URL(req.url);
  const lat = Number(u.searchParams.get("lat")), lng = Number(u.searchParams.get("lng"));
  const [p] = await sql<any>("SELECT id, name, lat, lng FROM pokebos WHERE id=$1", [u.searchParams.get("to")]);
  if (!p || !lat || !lng) throw new HttpError(400, "Need a destination and your location");
  const plan = planRoute({ lat, lng }, { lat: p.lat, lng: p.lng, name: p.name });
  await addLivePredictions(plan.legs);
  return plan;
});
