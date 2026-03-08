import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { PaymentSplit } from "@/lib/payment-splits";
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
      currency: { select: { id: true, code: true, symbol: true } },
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
    const gelAmount = t.amountInGel ?? t.amount;
    switch (t.type) {
      case "BUY_IN": summary.totalBuyIns += gelAmount; break;
      case "CASH_OUT": summary.totalCashOuts += gelAmount; break;
      case "DEPOSIT": summary.totalDeposits += gelAmount; break;
      case "WITHDRAWAL": summary.totalWithdrawals += gelAmount; break;
      case "RAKEBACK_PAYOUT": summary.totalRakebackPayouts += gelAmount; break;
    }
  }

  // Fetch opening balances for this date
  const openingBalances = await prisma.openingBalance.findMany({
    where: { date: dayStart },
  });
  const obMap: Record<string, number> = {};
  for (const ob of openingBalances) {
    obMap[ob.channel] = ob.amount;
  }

  // Per-channel breakdown
  const cashChannel = { name: "Cash", icon: "cash", opening: obMap["CASH"] || 0, in: 0, out: 0, net: 0, balance: 0 };
  const depositChannel = { name: "Deposits", icon: "deposit", opening: obMap["DEPOSITS"] || 0, in: 0, out: 0, net: 0, balance: 0 };
  const bankChannels: Record<string, { name: string; icon: string; opening: number; in: number; out: number; net: number; balance: number }> = {};

  // Helper to ensure a bank channel entry exists
  function ensureBankChannel(bankId: string, bankName: string) {
    if (!bankChannels[bankId]) {
      bankChannels[bankId] = { name: bankName, icon: "bank", opening: obMap[bankId] || 0, in: 0, out: 0, net: 0, balance: 0 };
    }
  }

  // Helper to attribute an amount to a channel
  function attributeToChannel(channelId: string, channelName: string, direction: "in" | "out", amount: number) {
    if (channelId === "CASH") {
      cashChannel[direction] += amount;
    } else if (channelId === "DEPOSITS") {
      depositChannel[direction] += amount;
    } else {
      ensureBankChannel(channelId, channelName);
      bankChannels[channelId][direction] += amount;
    }
  }

  for (const t of transactions) {
    const gelAmount = t.amountInGel ?? t.amount;
    const splits = t.paymentSplits as PaymentSplit[] | null;

    if (t.type === "DEPOSIT") {
      depositChannel.in += gelAmount;
      continue;
    }
    if (t.type === "WITHDRAWAL") {
      depositChannel.out += gelAmount;
      continue;
    }

    const direction = (t.type === "BUY_IN") ? "in" : "out";

    if (splits && Array.isArray(splits) && splits.length > 0) {
      // Distribute via payment splits
      let cashSplitTotal = 0;
      let bankSplitTotal = 0;
      for (const s of splits) {
        attributeToChannel(s.channel, s.channelName, direction, s.amountInGel);
        if (s.channel === "CASH") cashSplitTotal += s.amountInGel;
        else bankSplitTotal += s.amountInGel;
      }
      if (t.type === "BUY_IN") {
        summary.totalBuyInsCash += cashSplitTotal;
        summary.totalBuyInsBank += bankSplitTotal;
      }
    } else {
      // Legacy: single channel
      if (t.paymentMethod === "BANK" && t.bankAccount) {
        ensureBankChannel(t.bankAccount.id, t.bankAccount.name);
        bankChannels[t.bankAccount.id][direction] += gelAmount;
        if (t.type === "BUY_IN") summary.totalBuyInsBank += gelAmount;
      } else {
        cashChannel[direction] += gelAmount;
        if (t.type === "BUY_IN") summary.totalBuyInsCash += gelAmount;
      }
    }
  }

  // Include expenses in channel outflows
  const expenses = await prisma.expense.findMany({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
    select: { amount: true, paymentMethod: true, bankAccountId: true },
  });

  for (const exp of expenses) {
    if (exp.paymentMethod === "BANK" && exp.bankAccountId) {
      if (!bankChannels[exp.bankAccountId]) {
        const ba = await prisma.bankAccount.findUnique({ where: { id: exp.bankAccountId } });
        bankChannels[exp.bankAccountId] = { name: ba?.name || "Bank", icon: "bank", opening: obMap[exp.bankAccountId] || 0, in: 0, out: 0, net: 0, balance: 0 };
      }
      bankChannels[exp.bankAccountId].out += exp.amount;
    } else {
      cashChannel.out += exp.amount;
    }
  }

  cashChannel.net = cashChannel.in - cashChannel.out;
  cashChannel.balance = cashChannel.opening + cashChannel.net;
  depositChannel.net = depositChannel.in - depositChannel.out;
  depositChannel.balance = depositChannel.opening + depositChannel.net;
  Object.values(bankChannels).forEach(b => {
    b.net = b.in - b.out;
    b.balance = b.opening + b.net;
  });

  // Also include bank accounts that have opening balances but no transactions
  const allBankAccounts = await prisma.bankAccount.findMany({ where: { active: true } });
  for (const ba of allBankAccounts) {
    if (!bankChannels[ba.id] && obMap[ba.id]) {
      bankChannels[ba.id] = { name: ba.name, icon: "bank", opening: obMap[ba.id], in: 0, out: 0, net: 0, balance: obMap[ba.id] };
    }
  }

  const channels = [
    cashChannel,
    ...Object.values(bankChannels),
    depositChannel,
  ];

  // Rake collected today (from cashier rake collections)
  const rakeCollections = await prisma.rakeCollection.aggregate({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
    _sum: { amount: true },
  });
  const totalRake = rakeCollections._sum.amount || 0;

  // Tips collected today (physical cash received by cashier from dealers)
  const tipCollections = await prisma.tipCollection.aggregate({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
    _sum: { amount: true },
  });
  const totalTipsCollected = tipCollections._sum.amount || 0;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({
    date: dateStr,
    summary: { ...summary, totalRake, totalTipsCollected, totalExpenses },
    channels,
    transactions,
  });
}
