import { describe, it, expect } from 'vitest';
import { calculateConstructionSalary, SalaryCalculatorInput } from '@/lib/calculators/constructionSalaryCalculator';

describe('Construction & Technical Salary Calculator Unit Tests', () => {
  it('calculates monthly salary for UoP correctly', () => {
    const input: SalaryCalculatorInput = {
      rateType: 'monthly',
      rateValue: 8000,
      contractType: 'uop',
    };

    const res = calculateConstructionSalary(input);
    expect(res.grossMonthlyTotal).toBe(8000);
    expect(res.netMonthlySalary).toBeGreaterThan(5000);
    expect(res.netMonthlySalary).toBeLessThan(8000);
    expect(res.taxDeductions.totalDeductions).toBe(res.grossMonthlyTotal - res.netMonthlySalary);
  });

  it('calculates hourly rate with overtime for B2B Ryczałt 8.5%', () => {
    const input: SalaryCalculatorInput = {
      rateType: 'hourly',
      rateValue: 40, // 40 zł/h
      hoursPerMonth: 168,
      overtimeHours: 20,
      overtimeBonusPercent: 50, // 60 zł/h for overtime
      contractType: 'b2b_ryczalt_8_5',
    };

    const res = calculateConstructionSalary(input);
    // 40 * 168 = 6720 + 20 * 60 = 1200 => Gross: 7920 zł
    expect(res.grossMonthlyTotal).toBe(7920);
    expect(res.taxDeductions.pitTax).toBe(Math.round(7920 * 0.085)); // 673 zł
    expect(res.netMonthlySalary).toBe(7920 - res.taxDeductions.totalDeductions);
  });

  it('calculates 100% net earnings for Student < 26 on Umowa Zlecenie', () => {
    const input: SalaryCalculatorInput = {
      rateType: 'hourly',
      rateValue: 35,
      hoursPerMonth: 160,
      contractType: 'uz_student',
    };

    const res = calculateConstructionSalary(input);
    expect(res.grossMonthlyTotal).toBe(5600);
    expect(res.netMonthlySalary).toBe(5600);
    expect(res.taxDeductions.totalDeductions).toBe(0);
    expect(res.effectiveTaxRatePercent).toBe(0);
  });

  it('deducts fuel and tool amortisation from real disposable income', () => {
    const input: SalaryCalculatorInput = {
      rateType: 'monthly',
      rateValue: 7000,
      contractType: 'uz',
      monthlyFuelCost: 500,
      monthlyToolAmortization: 300,
    };

    const res = calculateConstructionSalary(input);
    expect(res.expenses.totalExpenses).toBe(800);
    expect(res.realDisposableIncome).toBe(res.netMonthlySalary - 800);
  });

  it('calculates piecework rate m² divided by team members', () => {
    const input: SalaryCalculatorInput = {
      rateType: 'piecework',
      rateValue: 70, // 70 zł/m²
      pieceworkUnitsPerMonth: 200, // 14,000 zł total team job
      teamMembersCount: 2, // 7,000 zł gross per person
      contractType: 'uop',
    };

    const res = calculateConstructionSalary(input);
    expect(res.grossMonthlyTotal).toBe(7000);
  });
});
