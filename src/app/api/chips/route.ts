import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const chips = await prisma.chip.findMany({
    where: { active: true },
    orderBy: { denomination: "asc" },
  });
  return NextResponse.json(chips);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { denomination, quantity, color } = await req.json();
  if (!denomination || denomination <= 0) {
    return NextResponse.json({ error: "denomination is required and must be positive" }, { status: 400 });
  }
  if (quantity === undefined || quantity < 0) {
    return NextResponse.json({ error: "quantity is required and must be non-negative" }, { status: 400 });
  }

  const existing = await prisma.chip.findFirst({
    where: { denomination: parseFloat(denomination), active: true },
  });
  if (existing) {
    return NextResponse.json({ error: "A chip with this denomination already exists" }, { status: 400 });
  }

  const chip = await prisma.chip.create({
    data: {
      denomination: parseFloat(denomination),
      quantity: parseInt(quantity),
      color: color || null,
    },
  });
  return NextResponse.json(chip, { status: 201 });
}
