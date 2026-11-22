import { sql } from "@/lib/db";
import { getPhoto } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ph] = await sql<{ storage_key: string; content_type: string }>("SELECT storage_key, content_type FROM photos WHERE id=$1", [Number(id) || 0]);
  const buf = ph && (await getPhoto(ph.storage_key));
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), { headers: { "content-type": ph.content_type, "cache-control": "public, max-age=31536000, immutable" } });
}
