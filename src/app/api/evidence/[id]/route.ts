import { currentUser } from "@/lib/session";
import { getRecord, readPhoto } from "@/lib/database";
import { canReadRecord } from "@/lib/access";
import { idSchema } from "@/lib/validation";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response(null, { status: 401 });
  const parsed = idSchema.safeParse((await params).id);
  if (!parsed.success) return new Response(null, { status: 404 });
  const activity = await getRecord("activities", parsed.data);
  if (!activity?.evidence || !canReadRecord(user, activity))
    return new Response(null, { status: 404 });
  const photo = await readPhoto(activity.evidence.photoPath);
  if (!photo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
