// Client-safe constants shared by candidate UI.

export const CANDIDATE_STATUSES = ["active", "submitted", "placed", "on_hold", "inactive"] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const AVAILABILITIES = [
  "immediate",
  "two_weeks",
  "one_month",
  "negotiable",
  "unavailable",
] as const;
export type Availability = (typeof AVAILABILITIES)[number];

export const CANDIDATE_STATUS_LABEL: Record<CandidateStatus, string> = {
  active: "Active",
  submitted: "Submitted",
  placed: "Placed",
  on_hold: "On hold",
  inactive: "Inactive",
};

export const CANDIDATE_STATUS_STYLES: Record<CandidateStatus, string> = {
  active: "bg-primary/15 text-primary border-primary/30",
  submitted: "bg-warning/15 text-warning border-warning/30",
  placed: "bg-success/15 text-success border-success/30",
  on_hold: "bg-muted text-muted-foreground border-border",
  inactive: "bg-muted text-muted-foreground border-border",
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  immediate: "Immediate",
  two_weeks: "2 weeks",
  one_month: "1 month",
  negotiable: "Negotiable",
  unavailable: "Unavailable",
};

export const VISA_OPTIONS = [
  "USC",
  "GC",
  "GC-EAD",
  "H1B",
  "H4-EAD",
  "L2",
  "OPT",
  "CPT",
  "TN",
  "EAD",
] as const;
