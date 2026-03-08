export interface PaymentSplit {
  channel: string;      // "CASH" or bankAccountId
  channelName: string;  // "Cash" or bank account name
  amount: number;       // in transaction currency
  amountInGel: number;  // converted to GEL
}

/**
 * Get the GEL amount attributed to a specific channel from a transaction.
 * Checks paymentSplits first; falls back to legacy paymentMethod/bankAccountId.
 */
export function getTransactionChannelAmount(
  tx: {
    paymentSplits?: unknown;
    paymentMethod?: string | null;
    bankAccountId?: string | null;
    amountInGel?: number | null;
    amount: number;
  },
  channelId: string
): number {
  const splits = tx.paymentSplits as PaymentSplit[] | null;
  if (splits && Array.isArray(splits) && splits.length > 0) {
    const match = splits.find(s => s.channel === channelId);
    return match ? match.amountInGel : 0;
  }
  // Legacy fallback
  const gelAmount = tx.amountInGel ?? tx.amount;
  if (channelId === "CASH") return tx.paymentMethod !== "BANK" ? gelAmount : 0;
  if (channelId === "DEPOSITS") return gelAmount;
  return (tx.paymentMethod === "BANK" && tx.bankAccountId === channelId) ? gelAmount : 0;
}
