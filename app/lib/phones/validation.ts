import type { Phone } from './schema';
export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'warning' | 'critical';
}
export function validatePhone(p: Phone): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const check = (
    field: string,
    v: number | undefined,
    min: number,
    max: number,
    severity: ValidationIssue['severity'] = 'critical',
  ) => {
    if (v != null && (v < min || v > max)) {
      issues.push({ field, message: `${field} is outside the plausible range (${min}–${max}).`, severity });
    }
  };
  check('display.sizeInches', p.display.sizeInches, 3, 9);
  check('dimensions.weightG', p.dimensions.weightG, 80, 400);
  check('dimensions.heightMm', p.dimensions.heightMm, 100, 220);
  check('dimensions.widthMm', p.dimensions.widthMm, 45, 120);
  check('dimensions.depthMm', p.dimensions.depthMm, 3, 30);
  check('display.refreshRateMaxHz', p.display.refreshRateMaxHz, 30, 240);
  check('battery.capacityMah', p.battery.capacityMah, 500, 12000);
  check('battery.wiredChargingWatts', p.battery.wiredChargingWatts, 0, 300, 'warning');
  check('battery.wirelessChargingWatts', p.battery.wirelessChargingWatts, 0, 150, 'warning');
  p.memory.storageOptionsGb.forEach((v) => {
    if (v <= 0 || v > 8192) {
      issues.push({
        field: 'memory.storageOptionsGb',
        message: 'Storage must be positive and no more than 8 TB.',
        severity: 'critical',
      });
    }
  });

  return issues;
}

export const isPublicationEligible = (phone: Phone) =>
  phone.publicationState !== 'needs-review' && !validatePhone(phone).some((issue) => issue.severity === 'critical');
