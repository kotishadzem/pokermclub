import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const { name } = await req.json();
  const status = await prisma.playerStatus.update({ where: { id }, data: { name } });
  return NextResponse.json(status);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;
  await prisma.playerStatus.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
