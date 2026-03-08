import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { bumpVersion } from "@/lib/version";
import { PaymentSplit, getTransactionChannelAmount } from "@/lib/payment-splits";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "CASHIER"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { amount, type, paymentMethod, bankAccountId, notes, currencyId, chipBreakdown, paymentSplits: rawSplits } = body;

  // Load original transaction
  const original = await prisma.transaction.findUnique({ where: { id } });
  if (!original) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const validTypes = ["BUY_IN", "CASH_OUT", "DEPOSIT", "WITHDRAWAL", "RAKEBACK_PAYOUT"];
  if (type && !validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
  }

  const newAmount = amount ?? original.amount;
  const newType = type ?? original.type;

  if (newAmount <= 0) {
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
  }

  // Resolve currency and exchange rate
  let currencyCode = "GEL";
  let exchangeRate = 1;
  let resolvedCurrencyId: string | null = null;

  if (currencyId === null) {
    currencyCode = "GEL";
    exchangeRate = 1;
    resolvedCurrencyId = null;
  } else if (currencyId) {
    const curr = await prisma.currency.findUnique({ where: { id: currencyId } });
    if (!curr || !curr.active) {
      return NextResponse.json({ error: "Invalid or inactive currency" }, { status: 400 });
    }
    currencyCode = curr.code;
    exchangeRate = curr.exchangeRate;
    resolvedCurrencyId = curr.id;
  } else {
    currencyCode = original.currencyCode;
    exchangeRate = original.exchangeRate;
    resolvedCurrencyId = original.currencyId;
  }

  const amountInGel = newAmount * exchangeRate;

  // Build payment splits
  let newSplits: PaymentSplit[] | null = null;
  if (rawSplits && Array.isArray(rawSplits) && rawSplits.length > 0) {
    newSplits = rawSplits.map((s: { channel: string; channelName: string; amount: number }) => ({
      channel: s.channel,
      channelName: s.channelName,
      amount: s.amount,
      amountInGel: s.amount * exchangeRate,
    }));
    const splitsTotal = newSplits.reduce((sum, s) => sum + s.amountInGel, 0);
    if (Math.abs(splitsTotal - amountInGel) > 0.01) {
      return NextResponse.json({ error: "Payment splits total does not match amount" }, { status: 400 });
    }
  } else if (rawSplits === undefined && original.paymentSplits) {
    // Keep original splits but recalculate amounts if amount/currency changed
    const origSplits = original.paymentSplits as PaymentSplit[];
    const origTotal = origSplits.reduce((sum, s) => sum + s.amountInGel, 0);
    if (Math.abs(origTotal - amountInGel) < 0.01) {
      newSplits = origSplits;
    } else {
      // Amount changed — can't keep old splits proportions, use legacy fallback
      const pm = paymentMethod ?? original.paymentMethod ?? "CASH";
      const baId = pm === "BANK" ? (bankAccountId ?? original.bankAccountId) : null;
      if (pm === "BANK" && baId) {
        const ba = await prisma.bankAccount.findUnique({ where: { id: baId } });
        newSplits = [{ channel: baId, channelName: ba?.name || "Bank", amount: newAmount, amountInGel }];
      } else {
        newSplits = [{ channel: "CASH", channelName: "Cash", amount: newAmount, amountInGel }];
      }
    }
  } else if (newType !== "DEPOSIT" && newType !== "WITHDRAWAL") {
    const pm = paymentMethod ?? original.paymentMethod ?? "CASH";
    const baId = pm === "BANK" ? (bankAccountId ?? original.bankAccountId) : null;
    if (pm === "BANK" && baId) {
      const ba = await prisma.bankAccount.findUnique({ where: { id: baId } });
      newSplits = [{ channel: baId, channelName: ba?.name || "Bank", amount: newAmount, amountInGel }];
    } else {
      newSplits = [{ channel: "CASH", channelName: "Cash", amount: newAmount, amountInGel }];
    }
  }

  // Balance check for outgoing transactions (per-channel, excluding original tx)
  if (newType === "CASH_OUT" || newType === "WITHDRAWAL" || newType === "RAKEBACK_PAYOUT") {
    const txDate = new Date(original.createdAt);
    const dayStr = txDate.toISOString().split("T")[0];
    const dayStart = new Date(dayStr + "T00:00:00.000Z");
    const dayEnd = new Date(dayStr + "T23:59:59.999Z");

    const channelsToCheck: { channel: string; channelName: string; needed: number }[] = [];
    if (newType === "WITHDRAWAL") {
      channelsToCheck.push({ channel: "DEPOSITS", channelName: "Deposits", needed: amountInGel });
    } else if (newSplits && newSplits.length > 0) {
      for (const s of newSplits) {
        channelsToCheck.push({ channel: s.channel, channelName: s.channelName, needed: s.amountInGel });
      }
    }

    if (channelsToCheck.length > 0) {
      const todayTxs = await prisma.transaction.findMany({
        where: { createdAt: { gte: dayStart, lte: dayEnd }, id: { not: id } },
        select: { type: true, amount: true, amountInGel: true, paymentMethod: true, bankAccountId: true, paymentSplits: true },
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
              if (t.type === "CASH_OUT" || t.type === "RAKEBACK_PAYOUT") totalOut += chAmount;
            }
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

  // Derive legacy fields from splits
  let legacyPaymentMethod = "CASH";
  let legacyBankAccountId: string | null = null;
  if (newType === "DEPOSIT" || newType === "WITHDRAWAL") {
    legacyPaymentMethod = "CASH";
  } else if (newSplits && newSplits.length === 1 && newSplits[0].channel !== "CASH") {
    legacyPaymentMethod = "BANK";
    legacyBankAccountId = newSplits[0].channel;
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      type: newType as "BUY_IN" | "CASH_OUT" | "DEPOSIT" | "WITHDRAWAL" | "RAKEBACK_PAYOUT",
      amount: newAmount,
      amountInGel,
      currencyId: resolvedCurrencyId,
      currencyCode,
      exchangeRate,
      paymentMethod: legacyPaymentMethod as "CASH" | "BANK",
      bankAccountId: legacyBankAccountId,
      notes: notes !== undefined ? (notes || null) : original.notes,
      ...(chipBreakdown !== undefined ? { chipBreakdown: chipBreakdown && Array.isArray(chipBreakdown) && chipBreakdown.length > 0 ? chipBreakdown : null } : {}),
      paymentSplits: newSplits && newSplits.length > 0 ? newSplits : null,
    },
    include: {
      player: { select: { id: true, firstName: true, lastName: true } },
      user: { select: { id: true, name: true } },
      bankAccount: { select: { id: true, name: true } },
      currency: { select: { id: true, code: true, symbol: true } },
    },
  });

  bumpVersion();
  return NextResponse.json(updated);
}
