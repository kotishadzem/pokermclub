import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const { name, description } = await req.json();
  const gameType = await prisma.gameType.update({ where: { id }, data: { name, description } });
  return NextResponse.json(gameType);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;
  await prisma.gameType.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
