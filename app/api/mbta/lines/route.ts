import { getLines } from "@/lib/mbta";
import { handle } from "@/lib/server";

export const GET = handle(async () => getLines());
