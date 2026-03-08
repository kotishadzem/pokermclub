import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.currency.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Currency not found" }, { status: 404 });

  const { name, symbol, exchangeRate } = await req.json();

  if (existing.isBase && exchangeRate !== undefined && exchangeRate !== 1) {
    return NextResponse.json({ error: "Cannot change base currency exchange rate" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (symbol !== undefined) data.symbol = symbol;
  if (exchangeRate !== undefined && !existing.isBase) data.exchangeRate = parseFloat(exchangeRate);

  const currency = await prisma.currency.update({ where: { id }, data });
  return NextResponse.json(currency);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.currency.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Currency not found" }, { status: 404 });
  if (existing.isBase) return NextResponse.json({ error: "Cannot delete base currency" }, { status: 400 });

  await prisma.currency.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
