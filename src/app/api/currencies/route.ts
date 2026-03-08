import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const currencies = await prisma.currency.findMany({
    where: { active: true },
    orderBy: [{ isBase: "desc" }, { code: "asc" }],
  });
  return NextResponse.json(currencies);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { code, name, symbol, exchangeRate } = await req.json();
  if (!code || !name || !symbol || !exchangeRate) {
    return NextResponse.json({ error: "code, name, symbol, and exchangeRate required" }, { status: 400 });
  }

  const currency = await prisma.currency.create({
    data: { code: code.toUpperCase(), name, symbol, exchangeRate: parseFloat(exchangeRate) },
  });
  return NextResponse.json(currency, { status: 201 });
}
