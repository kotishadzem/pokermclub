import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN", "PITBOSS"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  const table = await prisma.table.update({
    where: { id },
    data: body,
    include: { gameType: true },
  });

  return NextResponse.json(table);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN", "PITBOSS"]);
  if (error) return error;

  const { id } = await params;
  await prisma.table.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
