/**
 * Permission codes checked against the user's roles in BusinessFoundation Access.
 * Codes marked "documented" come from Docs (PropertyDomain API catalog §4, BF architecture);
 * the others follow the documented `Entity.Action` pattern and must be registered with the same code in Access.
 */
export const P = {
  PartyRead: "Party.Read", PartyCreate: "Party.Create", PartyUpdate: "Party.Update", PartyMerge: "Party.Merge",
  PremisesRead: "Premises.Read", PremisesCreate: "Premises.Create", PremisesUpdate: "Premises.Update",
  OwnershipRead: "Ownership.Read", OwnershipManage: "Ownership.Manage", OccupancyManage: "Occupancy.Manage",
  UsageRead: "Usage.Read", UsageManage: "Usage.Manage", UsageCaseDecide: "UsageCase.Decide", UsageCatalogManage: "UsageCatalog.Manage",
  CustomerRead: "Customer.Read", CustomerCreate: "Customer.Create", CustomerUpdate: "Customer.Update", CustomerMerge: "Customer.Merge", CustomerRestrict: "Customer.Restrict",
  RelationshipRead: "Relationship.Read", RelationshipManage: "Relationship.Manage", RelationshipCatalogManage: "RelationshipCatalog.Manage",
  // documented (B07)
  LifecycleRequest: "CustomerLifecycle.Request", LifecycleReopen: "CustomerLifecycle.Reopen", LifecycleReview: "CustomerLifecycle.Review",
  LifecycleApprove: "CustomerLifecycle.Approve", LifecycleExecute: "CustomerLifecycle.Execute", LifecycleRetry: "CustomerLifecycle.Retry",
  HistoryRead: "CustomerHistory.Read", ChangeRequest: "CustomerInformationChange.Request", ChangeRead: "CustomerInformationChange.Read",
  ChangeApprove: "CustomerInformationChange.Approve", ChangeExecute: "CustomerInformationChange.Execute", ChangeRetry: "CustomerInformationChange.Retry",
  TimelineRead: "CustomerTimeline.Read", TimelineRebuild: "CustomerTimeline.Rebuild",
  IntegrationMonitor: "System.Integration.Monitor", IntegrationRetry: "System.Integration.Retry", AuditRead: "bf.audit.read",
  // foundation
  OrganizationRead: "Organization.Read", OrganizationManage: "Organization.Manage", GeographyManage: "Geography.Manage",
  ReferenceManage: "ReferenceData.Manage", RegulationManage: "Regulation.Manage", AccessManage: "Access.Manage",
  CalendarRead: "Calendar.Read", BankingRead: "Banking.Read",
} as const;
export type PermissionCode = (typeof P)[keyof typeof P];
