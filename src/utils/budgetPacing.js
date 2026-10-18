/**
 * Proactive Retainer Burn & Budget Pacing Telemetry Engine
 * 
 * Accurately projects burn rate, detects scope creep before hours become
 * unbillable write-offs, and computes pacing warnings at 80% and 95% thresholds.
 */

export function calculateBudgetPacing({
  budgetLimit = 0,
  budgetType = 'NONE', // 'HOURS' | 'TASK_HOURS' | 'AMOUNT' | 'NONE'
  spentHours = 0,
  spentAmount = 0,
  taskBudgetsSum = 0,
  referenceDate = new Date(),
}) {
  const normType = String(budgetType || '').toUpperCase();
  const effectiveBudget = normType === 'TASK_HOURS'
    ? Number(taskBudgetsSum || 0)
    : (Number(budgetLimit) || 0);

  const isMonetary = normType === 'AMOUNT';
  const currentBurn = isMonetary ? Number(spentAmount || 0) : Number(spentHours || 0);

  if (!effectiveBudget || effectiveBudget <= 0 || normType === 'NONE') {
    return {
      hasBudget: false,
      normType,
      effectiveBudget: 0,
      currentBurn,
      burnPercent: 0,
      riskLevel: 'none',
      burnRateDaily: 0,
      projectedBurn: currentBurn,
      projectedOverrun: 0,
      daysRemaining: 0,
      alertMessage: null,
      isMonetary,
    };
  }

  const burnPercent = (currentBurn / effectiveBudget) * 100;

  // Calendar pacing calculation across the current billing period (month standard)
  const now = new Date(referenceDate);
  const dayOfMonth = now.getDate();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  
  // Estimate working business days elapsed (approx 22 work days in average month)
  const elapsedRatio = Math.max(0.1, Math.min(1.0, dayOfMonth / totalDaysInMonth));
  const estimatedWorkDaysElapsed = Math.max(1, Math.round(elapsedRatio * 22));
  const remainingWorkDays = Math.max(0, 22 - estimatedWorkDaysElapsed);

  // Velocity: Burn rate per business day
  const burnRateDaily = currentBurn / estimatedWorkDaysElapsed;
  const projectedBurn = currentBurn + (burnRateDaily * remainingWorkDays);
  const projectedOverrun = Math.max(0, projectedBurn - effectiveBudget);

  // Risk Classification
  let riskLevel = 'on_track'; // 'on_track' | 'warning' (>=80%) | 'critical' (>=95% or projected overrun)
  let alertMessage = null;

  if (burnPercent >= 95 || (burnPercent >= 80 && projectedOverrun > 0)) {
    riskLevel = 'critical';
    const overrunDisplay = isMonetary
      ? `$${Math.round(projectedOverrun).toLocaleString('en-US')}`
      : `${projectedOverrun.toFixed(1)} hrs`;
    alertMessage = `Critical Retainer Risk • ${Math.round(burnPercent)}% consumed. Projected to exceed budget by ${overrunDisplay} at current burn rate (${burnRateDaily.toFixed(1)}/day).`;
  } else if (burnPercent >= 80) {
    riskLevel = 'warning';
    alertMessage = `Approaching Retainer Cap • ${Math.round(burnPercent)}% consumed. Pacing closely to prevent unbillable write-offs.`;
  }

  return {
    hasBudget: true,
    normType,
    effectiveBudget,
    currentBurn,
    burnPercent: Math.round(burnPercent),
    burnRateDaily: Number(burnRateDaily.toFixed(2)),
    projectedBurn: Number(projectedBurn.toFixed(1)),
    projectedOverrun: Number(projectedOverrun.toFixed(1)),
    remainingWorkDays,
    riskLevel,
    alertMessage,
    isMonetary,
  };
}
