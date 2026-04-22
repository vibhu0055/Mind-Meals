// =========================
// HEALTH SERVICE
// =========================

// Calculate BMI
export const calculateBMI = (height_cm, weight_kg) => {
  const heightM = height_cm / 100;
  const bmi = weight_kg / (heightM * heightM);

  return parseFloat(bmi.toFixed(2));
};

// Get BMI Category
export const getBMICategory = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};