import { v4 as uuidv4 } from 'uuid';

export function generateHealthId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = uuidv4().substring(0, 8);
  return `CHR-${timestamp}-${randomPart}`.toUpperCase();
}

export function calculateBMI(weight: number, height: number): number {
  // BMI = weight (kg) / height (m)²
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

export function getMalnutritionStatus(bmi: number, age: number): string {
  // Simplified malnutrition assessment for children
  // In real implementation, would use WHO growth standards
  if (age < 2) {
    if (bmi < 14) return 'Severe Acute Malnutrition';
    if (bmi < 16) return 'Moderate Acute Malnutrition';
    return 'Normal';
  } else {
    if (bmi < 13.5) return 'Severe Acute Malnutrition';
    if (bmi < 15.5) return 'Moderate Acute Malnutrition';
    return 'Normal';
  }
}