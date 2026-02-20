import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireRole(roles: string[]) {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  if (!roles.includes((session.user as { role: string }).role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}
