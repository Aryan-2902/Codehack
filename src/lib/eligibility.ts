// Pure access-condition check shared by the resource page now and the booking flow later.
// Returns every unmet condition so the UI can explain *why* someone is blocked.
export type EligibilityResource = {
  allowedRoles: string[];
  allowedDepartments: string[];
  requiresVerified: boolean;
  requiresSafetyTraining: boolean;
  requiresEligibilityGrant: boolean;
};

export type EligibilityUser = {
  role: string;
  department: string;
  verified: boolean;
  safetyTrained: boolean;
};

export function checkEligibility(
  user: EligibilityUser,
  resource: EligibilityResource,
  hasGrant: boolean,
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (resource.allowedRoles.length && !resource.allowedRoles.includes(user.role)) {
    reasons.push("Your account type is not allowed to book this resource");
  }
  if (
    resource.allowedDepartments.length &&
    !resource.allowedDepartments.includes(user.department)
  ) {
    reasons.push(`Only available to: ${resource.allowedDepartments.join(", ")}`);
  }
  if (resource.requiresVerified && !user.verified) {
    reasons.push("Your ID must be verified by a lab owner or manager");
  }
  if (resource.requiresSafetyTraining && !user.safetyTrained) {
    reasons.push("Safety training must be completed first");
  }
  if (resource.requiresEligibilityGrant && !hasGrant) {
    reasons.push("You need to be approved for this specific equipment (e.g. induction)");
  }

  return { eligible: reasons.length === 0, reasons };
}
