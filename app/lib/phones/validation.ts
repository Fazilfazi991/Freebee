import type { Phone } from './schema';
export interface ValidationIssue {
  field: string;
  message: string;
}
export function validatePhone(p: Phone): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const check = (field: string, v: number | undefined, min: number, max: number) => {
    if (v != null && (v < min || v > max)) {
      issues.push({ field, message: `${field} is outside the plausible range (${min}–${max}).` });
    }
  };
  check('display.sizeInches', p.display.sizeInches, 2, 10);
  check('dimensions.weightG', p.dimensions.weightG, 50, 500);
  check('dimensions.heightMm', p.dimensions.heightMm, 80, 250);
  check('display.refreshRateMaxHz', p.display.refreshRateMaxHz, 20, 500);
  check('battery.capacityMah', p.battery.capacityMah, 200, 15000);
  p.memory.storageOptionsGb.forEach((v) => {
    if (v <= 0) {
      issues.push({ field: 'memory.storageOptionsGb', message: 'Storage must be positive.' });
    }
  });

  return issues;
}
