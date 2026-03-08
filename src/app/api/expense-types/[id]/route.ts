import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { id } = await params;
  const { name } = await req.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const duplicate = await prisma.expenseType.findFirst({
    where: { name: name.trim(), id: { not: id } },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Expense type with this name already exists" }, { status: 400 });
  }

  const updated = await prisma.expenseType.update({
    where: { id },
    data: { name: name.trim() },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { id } = await params;
  const updated = await prisma.expenseType.update({
    where: { id },
    data: { active: false },
  });
  return NextResponse.json(updated);
}
