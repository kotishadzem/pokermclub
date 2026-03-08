import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { bumpVersion } from "@/lib/version";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { amount, notes, tableId } = body;

  const original = await prisma.rakeCollection.findUnique({ where: { id } });
  if (!original) {
    return NextResponse.json({ error: "Rake collection not found" }, { status: 404 });
  }

  const newAmount = amount ?? original.amount;
  if (newAmount <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  const newTableId = tableId ?? original.tableId;
  if (tableId) {
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 400 });
    }
  }

  const updated = await prisma.rakeCollection.update({
    where: { id },
    data: {
      amount: newAmount,
      tableId: newTableId,
      notes: notes !== undefined ? (notes || null) : original.notes,
    },
    include: {
      table: { select: { id: true, name: true } },
      user: { select: { name: true } },
    },
  });

  bumpVersion();
  return NextResponse.json(updated);
}
