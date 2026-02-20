import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireRole(["ADMIN", "PITBOSS"]);
  if (error) return error;

  const dealers = await prisma.user.findMany({
    where: { role: "DEALER", active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(dealers);
}
