import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { bumpVersion } from "@/lib/version";
import { PaymentSplit, getTransactionChannelAmount } from "@/lib/payment-splits";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const url = new URL(req.url);
  const playerId = url.searchParams.get("playerId");
  const type = url.searchParams.get("type");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limit = parseInt(url.searchParams.get("limit") || "100");

  const where: Record<string, unknown> = {};
  if (playerId) where.playerId = playerId;
  if (type) where.type = type;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to + "T23:59:59.999Z");
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      player: { select: { id: true, firstName: true, lastName: true } },
      user: { select: { id: true, name: true } },
      bankAccount: { select: { id: true, name: true } },
      currency: { select: { id: true, code: true, symbol: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { playerId, type, amount, notes, paymentMethod, bankAccountId, currencyId, chipBreakdown, paymentSplits: rawSplits } = await req.json();
  if (!playerId || !type || amount === undefined) {
    return NextResponse.json({ error: "playerId, type, and amount required" }, { status: 400 });
  }

  const validTypes = ["BUY_IN", "CASH_OUT", "DEPOSIT", "WITHDRAWAL", "RAKEBACK_PAYOUT"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  // Resolve currency and exchange rate
  let currencyCode = "GEL";
  let exchangeRate = 1;
  let resolvedCurrencyId: string | null = null;

  if (currencyId) {
    const curr = await prisma.currency.findUnique({ where: { id: currencyId } });
    if (!curr || !curr.active) {
      return NextResponse.json({ error: "Invalid or inactive currency" }, { status: 400 });
    }
    currencyCode = curr.code;
    exchangeRate = curr.exchangeRate;
    resolvedCurrencyId = curr.id;
  }

  // Validate chip breakdown total matches amount
  if (chipBreakdown && Array.isArray(chipBreakdown) && chipBreakdown.length > 0) {
    const chipTotal = chipBreakdown.reduce((sum: number, c: { denomination: number; quantity: number }) => sum + c.denomination * c.quantity, 0);
    if (Math.abs(chipTotal - amount) > 0.01) {
      return NextResponse.json({ error: `Chip total (${chipTotal}) does not match amount (${amount})` }, { status: 400 });
    }
  }

  const amountInGel = amount * exchangeRate;

  // Build payment splits
  let paymentSplits: PaymentSplit[] | null = null;
  if (rawSplits && Array.isArray(rawSplits) && rawSplits.length > 0) {
    paymentSplits = rawSplits.map((s: { channel: string; channelName: string; amount: number }) => ({
      channel: s.channel,
      channelName: s.channelName,
      amount: s.amount,
      amountInGel: s.amount * exchangeRate,
    }));
    const splitsTotal = paymentSplits.reduce((sum, s) => sum + s.amountInGel, 0);
    if (Math.abs(splitsTotal - amountInGel) > 0.01) {
      return NextResponse.json({ error: "Payment splits total does not match amount" }, { status: 400 });
    }
  } else if (type !== "DEPOSIT" && type !== "WITHDRAWAL") {
    // No splits provided — build single-channel split from legacy fields
    if (paymentMethod === "BANK" && !bankAccountId) {
      return NextResponse.json({ error: "Bank account required for bank payments" }, { status: 400 });
    }
    if (paymentMethod === "BANK" && bankAccountId) {
      const ba = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      paymentSplits = [{ channel: bankAccountId, channelName: ba?.name || "Bank", amount, amountInGel }];
    } else {
      paymentSplits = [{ channel: "CASH", channelName: "Cash", amount, amountInGel }];
    }
  }

  // Balance check for outgoing transactions (per-channel)
  if (type === "CASH_OUT" || type === "WITHDRAWAL") {
    const today = new Date().toISOString().split("T")[0];
    const dayStart = new Date(today + "T00:00:00.000Z");
    const dayEnd = new Date(today + "T23:59:59.999Z");

    // Determine which channels to check
    const channelsToCheck: { channel: string; channelName: string; needed: number }[] = [];
    if (type === "WITHDRAWAL") {
      channelsToCheck.push({ channel: "DEPOSITS", channelName: "Deposits", needed: amountInGel });
    } else if (paymentSplits && paymentSplits.length > 0) {
      for (const s of paymentSplits) {
        channelsToCheck.push({ channel: s.channel, channelName: s.channelName, needed: s.amountInGel });
      }
    }

    if (channelsToCheck.length > 0) {
      const todayTxs = await prisma.transaction.findMany({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        select: { type: true, amount: true, amountInGel: true, paymentMethod: true, bankAccountId: true, paymentSplits: true },
      });

      // Also get today's expenses per channel
      const todayExpenses = await prisma.expense.findMany({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        select: { amount: true, paymentMethod: true, bankAccountId: true },
      });

      for (const ch of channelsToCheck) {
        const opening = await prisma.openingBalance.findUnique({
          where: { date_channel: { date: dayStart, channel: ch.channel } },
        });
        const openingAmount = opening?.amount || 0;

        let totalIn = 0;
        let totalOut = 0;

        for (const t of todayTxs) {
          const chAmount = getTransactionChannelAmount(t, ch.channel);
          if (chAmount > 0) {
            if (ch.channel === "DEPOSITS") {
              if (t.type === "DEPOSIT") totalIn += chAmount;
              if (t.type === "WITHDRAWAL") totalOut += chAmount;
            } else {
              if (t.type === "BUY_IN") totalIn += chAmount;
              if (t.type === "CASH_OUT") totalOut += chAmount;
            }
          }
        }

        // Expenses reduce channel balance
        if (ch.channel === "CASH") {
          for (const exp of todayExpenses) {
            if (exp.paymentMethod !== "BANK") totalOut += exp.amount;
          }
        } else if (ch.channel !== "DEPOSITS") {
          for (const exp of todayExpenses) {
            if (exp.paymentMethod === "BANK" && exp.bankAccountId === ch.channel) totalOut += exp.amount;
          }
        }

        const available = openingAmount + totalIn - totalOut;
        if (available < ch.needed) {
          return NextResponse.json(
            { error: `Insufficient funds in ${ch.channelName}. Available: GEL ${available.toFixed(2)}` },
            { status: 400 }
          );
        }
      }
    }
  }

  // Derive legacy paymentMethod/bankAccountId from splits for backward compat
  let legacyPaymentMethod = "CASH";
  let legacyBankAccountId: string | null = null;
  if (type === "DEPOSIT" || type === "WITHDRAWAL") {
    legacyPaymentMethod = "CASH";
  } else if (paymentSplits && paymentSplits.length === 1 && paymentSplits[0].channel !== "CASH") {
    legacyPaymentMethod = "BANK";
    legacyBankAccountId = paymentSplits[0].channel;
  } else if (paymentSplits && paymentSplits.length > 1) {
    // Multi-split: legacy fields not meaningful, set to CASH
    legacyPaymentMethod = "CASH";
  }

  const transaction = await prisma.transaction.create({
    data: {
      playerId,
      type,
      amount,
      notes: notes || null,
      paymentMethod: legacyPaymentMethod as "CASH" | "BANK",
      bankAccountId: legacyBankAccountId,
      currencyId: resolvedCurrencyId,
      currencyCode,
      exchangeRate,
      amountInGel,
      chipBreakdown: chipBreakdown && Array.isArray(chipBreakdown) && chipBreakdown.length > 0 ? chipBreakdown : undefined,
      paymentSplits: paymentSplits && paymentSplits.length > 0 ? paymentSplits : undefined,
      userId: (session!.user as { id: string }).id,
    },
    include: {
      player: { select: { firstName: true, lastName: true } },
    },
  });

  bumpVersion();
  return NextResponse.json(transaction, { status: 201 });
}
