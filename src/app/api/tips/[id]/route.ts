import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { bumpVersion } from "@/lib/version";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { amount, notes, tableId } = body;

  const original = await prisma.tipCollection.findUnique({ where: { id } });
  if (!original) {
    return NextResponse.json({ error: "Tip collection not found" }, { status: 404 });
  }

  const currentUserId = (session!.user as { id: string }).id;
  if (original.userId !== currentUserId) {
    return NextResponse.json({ error: "You can only edit your own records" }, { status: 403 });
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

  const updated = await prisma.tipCollection.update({
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
