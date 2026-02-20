import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN", "PITBOSS"]);
  if (error) return error;

  const { id } = await params;
  await prisma.waitingList.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
