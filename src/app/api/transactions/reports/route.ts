import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const url = new URL(req.url);
  const dateStr = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

  const dayStart = new Date(dateStr + "T00:00:00.000Z");
  const dayEnd = new Date(dateStr + "T23:59:59.999Z");

  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
    include: {
      player: { select: { firstName: true, lastName: true } },
      user: { select: { name: true } },
      bankAccount: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Aggregate
  const summary = {
    totalBuyIns: 0,
    totalBuyInsCash: 0,
    totalBuyInsBank: 0,
    totalCashOuts: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalRakebackPayouts: 0,
    transactionCount: transactions.length,
  };

  for (const t of transactions) {
    switch (t.type) {
      case "BUY_IN":
        summary.totalBuyIns += t.amount;
        if (t.paymentMethod === "BANK") summary.totalBuyInsBank += t.amount;
        else summary.totalBuyInsCash += t.amount;
        break;
      case "CASH_OUT": summary.totalCashOuts += t.amount; break;
      case "DEPOSIT": summary.totalDeposits += t.amount; break;
      case "WITHDRAWAL": summary.totalWithdrawals += t.amount; break;
      case "RAKEBACK_PAYOUT": summary.totalRakebackPayouts += t.amount; break;
    }
  }

  // Per-channel breakdown
  const cashChannel = { name: "Cash", icon: "cash", in: 0, out: 0, net: 0 };
  const depositChannel = { name: "Deposits", icon: "deposit", in: 0, out: 0, net: 0 };
  const bankChannels: Record<string, { name: string; icon: string; in: number; out: number; net: number }> = {};

  for (const t of transactions) {
    switch (t.type) {
      case "BUY_IN":
        if (t.paymentMethod === "BANK" && t.bankAccount) {
          if (!bankChannels[t.bankAccount.id]) {
            bankChannels[t.bankAccount.id] = { name: t.bankAccount.name, icon: "bank", in: 0, out: 0, net: 0 };
          }
          bankChannels[t.bankAccount.id].in += t.amount;
        } else {
          cashChannel.in += t.amount;
        }
        break;
      case "CASH_OUT":
        if (t.paymentMethod === "BANK" && t.bankAccount) {
          if (!bankChannels[t.bankAccount.id]) {
            bankChannels[t.bankAccount.id] = { name: t.bankAccount.name, icon: "bank", in: 0, out: 0, net: 0 };
          }
          bankChannels[t.bankAccount.id].out += t.amount;
        } else {
          cashChannel.out += t.amount;
        }
        break;
      case "DEPOSIT":
        depositChannel.in += t.amount;
        break;
      case "WITHDRAWAL":
        depositChannel.out += t.amount;
        break;
    }
  }

  cashChannel.net = cashChannel.in - cashChannel.out;
  depositChannel.net = depositChannel.in - depositChannel.out;
  Object.values(bankChannels).forEach(b => { b.net = b.in - b.out; });

  const channels = [
    cashChannel,
    ...Object.values(bankChannels),
    depositChannel,
  ];

  // Rake collected today
  const rakeRecords = await prisma.rakeRecord.findMany({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
  });
  const totalRake = rakeRecords.reduce((sum, r) => sum + r.rakeAmount, 0);

  return NextResponse.json({
    date: dateStr,
    summary: { ...summary, totalRake },
    channels,
    transactions,
  });
}
