import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { bumpVersion } from "@/lib/version";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const body = await req.json();
  const { tableId, amount, notes } = body;

  if (!tableId || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { error: "tableId and a positive amount are required" },
      { status: 400 },
    );
  }

  const userId = (session!.user as { id: string }).id;

  const tipCollection = await prisma.tipCollection.create({
    data: {
      tableId,
      amount,
      notes: notes || null,
      userId,
    },
    include: {
      table: { select: { name: true } },
      user: { select: { name: true } },
    },
  });

  bumpVersion();
  return NextResponse.json(tipCollection, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const url = new URL(req.url);
  const dateStr =
    url.searchParams.get("date") || new Date().toISOString().split("T")[0];

  const dayStart = new Date(dateStr + "T00:00:00.000Z");
  const dayEnd = new Date(dateStr + "T23:59:59.999Z");

  const collections = await prisma.tipCollection.findMany({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
    include: {
      table: { select: { id: true, name: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const grandTotal = collections.reduce((sum, c) => sum + c.amount, 0);

  // Group by table
  const tableMap: Record<
    string,
    { tableId: string; tableName: string; total: number; count: number }
  > = {};
  for (const c of collections) {
    if (!tableMap[c.tableId]) {
      tableMap[c.tableId] = {
        tableId: c.tableId,
        tableName: c.table.name,
        total: 0,
        count: 0,
      };
    }
    tableMap[c.tableId].total += c.amount;
    tableMap[c.tableId].count += 1;
  }

  return NextResponse.json({
    date: dateStr,
    grandTotal,
    byTable: Object.values(tableMap),
    collections,
  });
}
