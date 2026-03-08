import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const types = await prisma.expenseType.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(types);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.expenseType.findUnique({ where: { name: name.trim() } });
  if (existing) {
    if (!existing.active) {
      const reactivated = await prisma.expenseType.update({
        where: { id: existing.id },
        data: { active: true },
      });
      return NextResponse.json(reactivated, { status: 201 });
    }
    return NextResponse.json({ error: "Expense type already exists" }, { status: 400 });
  }

  const created = await prisma.expenseType.create({
    data: { name: name.trim() },
  });
  return NextResponse.json(created, { status: 201 });
}
