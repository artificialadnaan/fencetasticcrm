import {
  type CommissionInput,
  type CommissionBreakdown,
  PaymentMethod,
} from './types';
import {
  CC_FEE_RATE,
  ADNAAN_COMMISSION_RATE,
  MEME_COMMISSION_RATE,
  AIMANN_DEDUCTION_RATE,
} from './constants';

/**
 * Round a number to 2 decimal places using "round half-up" strategy.
 */
function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate the full commission waterfall for a project.
 *
 * Calculation order:
 * 1. Money Received (apply CC fee if credit card)
 * 2. Total Expenses (materials + subcontractor owed)
 * 3. Commissions (Adnaan 10%, Meme 5% — based on projectTotal)
 * 4. Gross Profit (moneyReceived - totalExpenses - adnaanCommission)
 * 5. Aimann Deduction (25% of max(grossProfit, 0) if debt > 0)
 * 6. Net Profit (grossProfit - aimannDeduction - memeCommission)
 */
export function calculateCommission(input: CommissionInput): CommissionBreakdown {
  const {
    projectTotal,
    paymentMethod,
    materialsCost,
    subOwedTotal,
    aimannDebtBalance,
  } = input;

  // Step 1: Money Received
  const moneyReceived = roundMoney(
    paymentMethod === PaymentMethod.CREDIT_CARD
      ? projectTotal * (1 - CC_FEE_RATE)
      : projectTotal
  );

  // Step 2: Total Expenses
  const totalExpenses = roundMoney(materialsCost + subOwedTotal);

  // Step 3: Commissions (based on projectTotal, not moneyReceived)
  const adnaanCommission = roundMoney(projectTotal * ADNAAN_COMMISSION_RATE);
  const memeCommission = roundMoney(projectTotal * MEME_COMMISSION_RATE);

  // Step 4: Gross Profit
  const grossProfit = roundMoney(moneyReceived - totalExpenses - adnaanCommission);

  // Step 5: Aimann Deduction
  const aimannDeduction =
    aimannDebtBalance > 0
      ? roundMoney(Math.max(grossProfit, 0) * AIMANN_DEDUCTION_RATE)
      : 0;

  // Step 6: Net Profit
  const netProfit = roundMoney(grossProfit - aimannDeduction - memeCommission);

  return {
    moneyReceived,
    totalExpenses,
    adnaanCommission,
    memeCommission,
    grossProfit,
    aimannDeduction,
    netProfit,
  };
}
