import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const url = new URL(req.url);
  const dateStr = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const date = new Date(dateStr + "T00:00:00.000Z");

  const balances = await prisma.openingBalance.findMany({
    where: { date },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json(balances);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { date, time, balances } = await req.json() as {
    date: string;
    time: string;
    balances: { channel: string; amount: number }[];
  };

  if (!date || !time || !balances?.length) {
    return NextResponse.json({ error: "date, time, and balances required" }, { status: 400 });
  }

  const dateValue = new Date(date + "T00:00:00.000Z");
  const userId = (session!.user as { id: string }).id;

  const results = await Promise.all(
    balances.map((b) =>
      prisma.openingBalance.upsert({
        where: { date_channel: { date: dateValue, channel: b.channel } },
        update: { amount: b.amount, time, userId },
        create: { date: dateValue, time, channel: b.channel, amount: b.amount, userId },
      })
    )
  );

  return NextResponse.json(results, { status: 200 });
}
