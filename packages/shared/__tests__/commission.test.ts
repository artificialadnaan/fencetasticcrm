import { describe, it, expect } from 'vitest';
import { calculateCommission } from '../src/commission';
import { PaymentMethod } from '../src/types';

describe('calculateCommission', () => {
  it('calculates correctly for a cash project with positive profit', () => {
    const result = calculateCommission({
      projectTotal: 10000,
      paymentMethod: PaymentMethod.CASH,
      materialsCost: 2000,
      subOwedTotal: 1500,
      aimannDebtBalance: 5000,
    });
    expect(result.moneyReceived).toBe(10000);
    expect(result.totalExpenses).toBe(3500);
    expect(result.adnaanCommission).toBe(1000);
    expect(result.memeCommission).toBe(500);
    expect(result.grossProfit).toBe(5500);
    expect(result.aimannDeduction).toBe(1375);
    expect(result.netProfit).toBe(3625);
  });

  it('applies 3% CC fee for credit card payments', () => {
    const result = calculateCommission({
      projectTotal: 10000,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      materialsCost: 2000,
      subOwedTotal: 1500,
      aimannDebtBalance: 5000,
    });
    expect(result.moneyReceived).toBe(9700);
    expect(result.totalExpenses).toBe(3500);
    expect(result.adnaanCommission).toBe(1000);
    expect(result.memeCommission).toBe(500);
    expect(result.grossProfit).toBe(5200);
    expect(result.aimannDeduction).toBe(1300);
    expect(result.netProfit).toBe(3400);
  });

  it('applies no CC fee for check payments', () => {
    const result = calculateCommission({
      projectTotal: 5000,
      paymentMethod: PaymentMethod.CHECK,
      materialsCost: 1000,
      subOwedTotal: 500,
      aimannDebtBalance: 1000,
    });
    expect(result.moneyReceived).toBe(5000);
  });

  it('sets aimannDeduction to 0 when debt balance is zero', () => {
    const result = calculateCommission({
      projectTotal: 10000,
      paymentMethod: PaymentMethod.CASH,
      materialsCost: 2000,
      subOwedTotal: 1500,
      aimannDebtBalance: 0,
    });
    expect(result.aimannDeduction).toBe(0);
    expect(result.netProfit).toBe(5000);
  });

  it('guards aimannDeduction to 0 when grossProfit is negative', () => {
    const result = calculateCommission({
      projectTotal: 5000,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      materialsCost: 4000,
      subOwedTotal: 2000,
      aimannDebtBalance: 5000,
    });
    expect(result.moneyReceived).toBe(4850);
    expect(result.totalExpenses).toBe(6000);
    expect(result.adnaanCommission).toBe(500);
    expect(result.grossProfit).toBe(-1650);
    expect(result.aimannDeduction).toBe(0);
    expect(result.memeCommission).toBe(250);
    expect(result.netProfit).toBe(-1900);
  });

  it('handles zero subcontractor costs', () => {
    const result = calculateCommission({
      projectTotal: 8000,
      paymentMethod: PaymentMethod.CASH,
      materialsCost: 1500,
      subOwedTotal: 0,
      aimannDebtBalance: 3000,
    });
    expect(result.totalExpenses).toBe(1500);
    expect(result.grossProfit).toBe(5700);
    expect(result.aimannDeduction).toBe(1425);
    expect(result.netProfit).toBe(3875);
  });

  it('handles zero materials cost', () => {
    const result = calculateCommission({
      projectTotal: 3000,
      paymentMethod: PaymentMethod.CASH,
      materialsCost: 0,
      subOwedTotal: 500,
      aimannDebtBalance: 0,
    });
    expect(result.totalExpenses).toBe(500);
    expect(result.aimannDeduction).toBe(0);
    expect(result.grossProfit).toBe(2200);
    expect(result.netProfit).toBe(2050);
  });

  it('rounds all monetary values to 2 decimal places', () => {
    const result = calculateCommission({
      projectTotal: 3333,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      materialsCost: 1111,
      subOwedTotal: 222,
      aimannDebtBalance: 1000,
    });
    expect(result.moneyReceived).toBe(3233.01);
    expect(result.adnaanCommission).toBe(333.3);
    expect(result.memeCommission).toBe(166.65);
    expect(result.totalExpenses).toBe(1333);
    expect(result.grossProfit).toBe(1566.71);
    expect(result.aimannDeduction).toBe(391.68);
    expect(result.netProfit).toBe(1008.38);
  });

  it('handles a very small project', () => {
    const result = calculateCommission({
      projectTotal: 100,
      paymentMethod: PaymentMethod.CASH,
      materialsCost: 50,
      subOwedTotal: 0,
      aimannDebtBalance: 100,
    });
    expect(result.moneyReceived).toBe(100);
    expect(result.adnaanCommission).toBe(10);
    expect(result.memeCommission).toBe(5);
    expect(result.grossProfit).toBe(40);
    expect(result.aimannDeduction).toBe(10);
    expect(result.netProfit).toBe(25);
  });

  it('handles negative debt balance gracefully (overpaid)', () => {
    const result = calculateCommission({
      projectTotal: 10000,
      paymentMethod: PaymentMethod.CASH,
      materialsCost: 2000,
      subOwedTotal: 1000,
      aimannDebtBalance: -500,
    });
    expect(result.aimannDeduction).toBe(0);
  });

  it('uses an explicit total expense override when provided', () => {
    const result = calculateCommission({
      projectTotal: 2625,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      materialsCost: 402.74,
      subOwedTotal: 0,
      expenseOverride: 852.74,
      aimannDebtBalance: 0,
    });

    expect(result.totalExpenses).toBe(852.74);
    expect(result.grossProfit).toBe(1431.01);
    expect(result.netProfit).toBe(1299.76);
  });
});
