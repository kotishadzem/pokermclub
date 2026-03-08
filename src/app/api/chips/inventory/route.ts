import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextResponse } from "next/server";

interface ChipEntry {
  chipId: string;
  denomination: number;
  color?: string | null;
  quantity: number;
}

export async function GET() {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  // Get all active chips (total inventory)
  const allChips = await prisma.chip.findMany({
    where: { active: true },
    orderBy: { denomination: "asc" },
  });

  // Initialize per-chip counters
  const inventory: Record<string, { chipId: string; denomination: number; color: string | null; total: number; cashier: number }> = {};
  for (const c of allChips) {
    inventory[c.id] = { chipId: c.id, denomination: c.denomination, color: c.color, total: c.quantity, cashier: c.quantity };
  }

  // Helper to process chip breakdown arrays
  function processBreakdown(breakdown: unknown, direction: 1 | -1) {
    if (!Array.isArray(breakdown)) return;
    for (const entry of breakdown as ChipEntry[]) {
      const id = entry.chipId;
      if (id && inventory[id]) {
        inventory[id].cashier += direction * (entry.quantity || 0);
      }
    }
  }

  // BUY_IN: chips leave cashier (-1)
  // CASH_OUT: chips enter cashier (+1)
  const transactions = await prisma.transaction.findMany({
    where: { chipBreakdown: { not: null } },
    select: { type: true, chipBreakdown: true },
  });
  for (const tx of transactions) {
    if (tx.type === "BUY_IN") processBreakdown(tx.chipBreakdown, -1);
    else if (tx.type === "CASH_OUT") processBreakdown(tx.chipBreakdown, 1);
  }

  // Rake collections: chips enter cashier (+1)
  const rakeCollections = await prisma.rakeCollection.findMany({
    where: { chipBreakdown: { not: null } },
    select: { chipBreakdown: true },
  });
  for (const rc of rakeCollections) {
    processBreakdown(rc.chipBreakdown, 1);
  }

  // Tip collections: chips enter cashier (+1)
  const tipCollections = await prisma.tipCollection.findMany({
    where: { chipBreakdown: { not: null } },
    select: { chipBreakdown: true },
  });
  for (const tc of tipCollections) {
    processBreakdown(tc.chipBreakdown, 1);
  }

  // Internal expenses: chips leave cashier (-1)
  const expenses = await prisma.expense.findMany({
    where: { chipBreakdown: { not: null } },
    select: { chipBreakdown: true },
  });
  for (const exp of expenses) {
    processBreakdown(exp.chipBreakdown, -1);
  }

  const chips = Object.values(inventory).map(c => ({
    ...c,
    field: c.total - c.cashier,
  }));

  return NextResponse.json({ chips });
}
