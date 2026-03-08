import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.chip.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Chip not found" }, { status: 404 });

  const { denomination, quantity, color } = await req.json();

  const data: Record<string, unknown> = {};
  if (denomination !== undefined) data.denomination = parseFloat(denomination);
  if (quantity !== undefined) data.quantity = parseInt(quantity);
  if (color !== undefined) data.color = color || null;

  const chip = await prisma.chip.update({ where: { id }, data });
  return NextResponse.json(chip);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.chip.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Chip not found" }, { status: 404 });

  await prisma.chip.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
