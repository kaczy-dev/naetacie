/**
 * Polish Salary Net/Gross Tax Calculator Helper
 */

export interface SalaryBreakdown {
  gross: number;
  uopNet: number;
  uzNet: number;
  uzStudentNet: number;
  b2bNet: number;
  b2bRyczalt12Net: number;
}

export function calculateNetSalary(gross: number): SalaryBreakdown {
  // UoP (Umowa o pracę): ~72.7% brutto
  const uopNet = Math.round(gross * 0.727);

  // UZ (Umowa zlecenie z ZUS): ~73.5% brutto
  const uzNet = Math.round(gross * 0.735);

  // UZ Student (do 26 roku życia): 100% brutto
  const uzStudentNet = gross;

  // B2B Ryczałt 8.5% (Standard B2B): szacunek ~81.5% brutto
  const b2bNet = Math.max(0, Math.round(gross * 0.815 - 450));

  // B2B Ryczałt 12% (IT / Programowanie / Konsulting): szacunek ~78% brutto
  const b2bRyczalt12Net = Math.max(0, Math.round(gross * 0.78 - 450));

  return {
    gross,
    uopNet,
    uzNet,
    uzStudentNet,
    b2bNet,
    b2bRyczalt12Net,
  };
}
