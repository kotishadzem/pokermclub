import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { ALLOWED_CURRENCIES, CURRENCY_SYMBOLS } from "@/lib/currency-symbols";
import { bumpVersion } from "@/lib/version";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireRole(["ADMIN", "PITBOSS", "CASHIER", "DEALER", "REGISTRATOR"]);
  if (error) return error;

  const setting = await prisma.setting.findUnique({ where: { key: "currency" } });
  return NextResponse.json({ currency: setting?.value ?? "USD" });
}

export async function PUT(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { currency } = await req.json();
  if (!currency || !ALLOWED_CURRENCIES.includes(currency)) {
    return NextResponse.json(
      { error: `Invalid currency. Allowed: ${ALLOWED_CURRENCIES.join(", ")}` },
      { status: 400 },
    );
  }

  await prisma.setting.upsert({
    where: { key: "currency" },
    update: { value: currency },
    create: { key: "currency", value: currency },
  });

  bumpVersion();
  return NextResponse.json({ currency, symbol: CURRENCY_SYMBOLS[currency] });
}
