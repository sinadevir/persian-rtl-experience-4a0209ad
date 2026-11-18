# Segregation of Duties (SoD) Policy — BusinessFoundation

## Scope of enforcement (current version)

SoD rules are evaluated **tenant-wide for the same user**.

- Conflict is detected when the same `UserId` holds two roles that appear in an active `RoleSegregationRule` with **overlapping effective time windows**.
- **CompanyId / OrganizationalUnitId of the role assignment are ignored** for SoD.
- Interpretation: two mutually exclusive duties must not be granted to one person anywhere in the tenant, even in different companies.

## Concurrent safety

`AssignRole` re-validates overlap + SoD inside a **Serializable** transaction so two concurrent assigns cannot both succeed.

## What this is not

- Not ABAC resource-level SoD.
- Not company-scoped SoD (would require product decision + schema change).

## Changing the policy later

If organization policy requires scope-local SoD only, adjust the conflict query to also match `CompanyId` / `OrganizationalUnitId` and document the change as a breaking semantic update for consumers.
