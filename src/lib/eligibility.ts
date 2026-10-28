// Access-condition checks shared by the resource page, search and the booking flow.
// Each applicable condition becomes one Check so the UI can show exactly what passed or failed.
export type Check = {
  key: string;
  label: string;
  ok: boolean;
  /** Why it failed, in words a requester can act on. */
  message?: string;
};

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

/** One check per condition the resource actually sets (empty lists mean "no restriction"). */
export function eligibilityChecks(
  user: EligibilityUser,
  resource: EligibilityResource,
  hasGrant: boolean,
): Check[] {
  const checks: Check[] = [];

  if (resource.allowedRoles.length) {
    checks.push({
      key: "role",
      label: "Your account type can book this",
      ok: resource.allowedRoles.includes(user.role),
      message: "Your account type is not allowed to book this resource",
    });
  }
  if (resource.allowedDepartments.length) {
    checks.push({
      key: "department",
      label: "Open to your department",
      ok: resource.allowedDepartments.includes(user.department),
      message: `Only available to: ${resource.allowedDepartments.join(", ")}`,
    });
  }
  if (resource.requiresVerified) {
    checks.push({
      key: "verified",
      label: "ID verified",
      ok: user.verified,
      message: "Your ID must be verified by a lab owner or manager",
    });
  }
  if (resource.requiresSafetyTraining) {
    checks.push({
      key: "safety",
      label: "Safety training completed",
      ok: user.safetyTrained,
      message: "Safety training must be completed first",
    });
  }
  if (resource.requiresEligibilityGrant) {
    checks.push({
      key: "grant",
      label: "Approved for this equipment",
      ok: hasGrant,
      message: "You need to be approved for this specific equipment (e.g. induction)",
    });
  }
  return checks;
}

export function checkEligibility(
  user: EligibilityUser,
  resource: EligibilityResource,
  hasGrant: boolean,
): { eligible: boolean; reasons: string[] } {
  const failed = eligibilityChecks(user, resource, hasGrant).filter((c) => !c.ok);
  return { eligible: failed.length === 0, reasons: failed.map((c) => c.message!) };
}
