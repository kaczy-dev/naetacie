/**
 * Advanced Construction & Technical Salary Calculator Module (Kalkulator Zarobków Budowlanych).
 * Handles multi-mode rate calculations (Hourly, Piecework m², Daily, Monthly),
 * tax contracts (UoP, UZ, UZ Student <26, B2B Ryczałt 8.5%/12%, B2B Liniowy 19%),
 * overtime bonuses, and net earnings after fuel & equipment amortisation expenses.
 */

export type ContractType = 'uop' | 'uz' | 'uz_student' | 'b2b_ryczalt_8_5' | 'b2b_ryczalt_12' | 'b2b_liniowy';

export type RateType = 'monthly' | 'hourly' | 'daily' | 'piecework';

export interface SalaryCalculatorInput {
  rateType: RateType;
  rateValue: number; // e.g. 7000 zł/mc, 40 zł/h, 300 zł/dniówka, 65 zł/m²
  hoursPerMonth?: number; // default 168h
  overtimeHours?: number; // e.g. 20h
  overtimeBonusPercent?: number; // e.g. 50% or 100%
  pieceworkUnitsPerMonth?: number; // e.g. 120 m²
  teamMembersCount?: number; // default 1
  daysPerMonth?: number; // default 21
  contractType: ContractType;
  monthlyFuelCost?: number; // e.g. 400 zł
  monthlyToolAmortization?: number; // e.g. 200 zł
}

export interface DetailedSalaryBreakdown {
  grossMonthlyTotal: number;
  netMonthlySalary: number;
  realDisposableIncome: number; // Net minus fuel & tool amortisation
  taxDeductions: {
    zusSocial: number;
    zusHealth: number;
    pitTax: number;
    totalDeductions: number;
  };
  effectiveTaxRatePercent: number;
  hourlyNetRate: number;
  expenses: {
    fuel: number;
    tools: number;
    totalExpenses: number;
  };
}

export function calculateConstructionSalary(input: SalaryCalculatorInput): DetailedSalaryBreakdown {
  const {
    rateType,
    rateValue,
    hoursPerMonth = 168,
    overtimeHours = 0,
    overtimeBonusPercent = 50,
    pieceworkUnitsPerMonth = 100,
    teamMembersCount = 1,
    daysPerMonth = 21,
    contractType,
    monthlyFuelCost = 0,
    monthlyToolAmortization = 0,
  } = input;

  // 1. Compute total monthly gross earnings before taxes & expenses
  let baseGross = 0;

  if (rateType === 'monthly') {
    baseGross = rateValue;
  } else if (rateType === 'hourly') {
    const regularPay = rateValue * hoursPerMonth;
    const overtimePay = rateValue * (1 + overtimeBonusPercent / 100) * overtimeHours;
    baseGross = regularPay + overtimePay;
  } else if (rateType === 'daily') {
    baseGross = rateValue * daysPerMonth;
  } else if (rateType === 'piecework') {
    const totalJobVal = rateValue * pieceworkUnitsPerMonth;
    baseGross = teamMembersCount > 0 ? totalJobVal / teamMembersCount : totalJobVal;
  }

  // Ensure non-negative base gross
  baseGross = Math.max(0, baseGross);

  // 2. Compute Taxes & ZUS based on Polish Tax System rules
  let zusSocial = 0;
  let zusHealth = 0;
  let pitTax = 0;

  if (contractType === 'uop') {
    // Umowa o Pracę (Standard 2026 Polish tax rules estimate)
    zusSocial = Math.round(baseGross * 0.1371); // Emerytalna (9.76%) + Rentowa (1.5%) + Chorobowa (2.45%)
    const baseHealth = baseGross - zusSocial;
    zusHealth = Math.round(baseHealth * 0.09);
    const kup = 250; // Standard Koszty Uzyskania Przychodu
    const taxBase = Math.max(0, baseGross - zusSocial - kup);
    const taxBeforeRelief = taxBase * 0.12;
    const taxFreeMonthlyRelief = 300; // 3600 / 12
    pitTax = Math.max(0, Math.round(taxBeforeRelief - taxFreeMonthlyRelief));
  } else if (contractType === 'uz') {
    // Umowa Zlecenie (Standard)
    zusSocial = Math.round(baseGross * 0.1371);
    const baseHealth = baseGross - zusSocial;
    zusHealth = Math.round(baseHealth * 0.09);
    const kup = Math.round((baseGross - zusSocial) * 0.2); // 20% KUP
    const taxBase = Math.max(0, baseGross - zusSocial - kup);
    pitTax = Math.max(0, Math.round(taxBase * 0.12 - 300));
  } else if (contractType === 'uz_student') {
    // Umowa Zlecenie Student < 26 (0% ZUS + 0% PIT)
    zusSocial = 0;
    zusHealth = 0;
    pitTax = 0;
  } else if (contractType === 'b2b_ryczalt_8_5') {
    // B2B Ryczałt 8.5% (Pełny ZUS ok. 1600 zł + ZUS Zdrowotny ~420 zł)
    zusSocial = 1600;
    zusHealth = 420;
    pitTax = Math.round(baseGross * 0.085);
  } else if (contractType === 'b2b_ryczalt_12') {
    // B2B Ryczałt 12% (IT / Inżynierzy)
    zusSocial = 1600;
    zusHealth = 420;
    pitTax = Math.round(baseGross * 0.12);
  } else if (contractType === 'b2b_liniowy') {
    // B2B Liniowy 19%
    zusSocial = 1600;
    const taxBase = Math.max(0, baseGross - zusSocial);
    zusHealth = Math.round(taxBase * 0.049); // 4.9% zdrowotna
    pitTax = Math.round(taxBase * 0.19);
  }

  const totalDeductions = zusSocial + zusHealth + pitTax;
  const netMonthlySalary = Math.max(0, baseGross - totalDeductions);

  // 3. Subtract operating expenses (fuel & tool amortisation)
  const totalExpenses = monthlyFuelCost + monthlyToolAmortization;
  const realDisposableIncome = Math.max(0, netMonthlySalary - totalExpenses);

  // 4. Calculate effective tax rate and net hourly rate
  const totalEffectiveHours = hoursPerMonth + overtimeHours;
  const hourlyNetRate = totalEffectiveHours > 0 ? parseFloat((realDisposableIncome / totalEffectiveHours).toFixed(2)) : 0;
  const effectiveTaxRatePercent = baseGross > 0 ? parseFloat(((totalDeductions / baseGross) * 100).toFixed(1)) : 0;

  return {
    grossMonthlyTotal: Math.round(baseGross),
    netMonthlySalary: Math.round(netMonthlySalary),
    realDisposableIncome: Math.round(realDisposableIncome),
    taxDeductions: {
      zusSocial,
      zusHealth,
      pitTax,
      totalDeductions,
    },
    effectiveTaxRatePercent,
    hourlyNetRate,
    expenses: {
      fuel: monthlyFuelCost,
      tools: monthlyToolAmortization,
      totalExpenses,
    },
  };
}
