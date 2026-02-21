import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const bankAccounts = await prisma.bankAccount.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(bankAccounts);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const bankAccount = await prisma.bankAccount.create({ data: { name } });
  return NextResponse.json(bankAccount, { status: 201 });
}
