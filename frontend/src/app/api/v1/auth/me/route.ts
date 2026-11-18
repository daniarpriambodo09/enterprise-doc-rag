import { connection, NextRequest, NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  await connection();
  const actor = await getCurrentActor(req);

  if (actor.type === "user") {
    return NextResponse.json({
      user: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
      },
    });
  }

  return NextResponse.json({ user: null });
}
