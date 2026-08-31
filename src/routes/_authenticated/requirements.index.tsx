import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { AppTopbar } from "@/components/app-shell/topbar";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { listRequirements } from "@/lib/requirements.functions";
import {
  REQ_STATUSES,
  REQ_PRIORITIES,
  STATUS_LABEL,
  PRIORITY_LABEL,
  STATUS_STYLES,
  PRIORITY_STYLES,
  formatRate,
} from "@/lib/requirements-constants";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sparkles,
  ArrowUpDown,
  Calendar,
  DollarSign,
  Building,
  Mail,
  Phone,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/requirements/")({
  head: () => ({ meta: [{ title: "Requisitions — Staffinix" }] }),
  component: RequisitionsListPage,
});

function RequisitionsListPage() {
  const listFn = useServerFn(listRequirements);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_desc");
  const [page, setPage] = useState(1);
  const [reviewReq, setReviewReq] = useState<any | null>(null);
  const pageSize = 20;

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status !== "all" ? [status as (typeof REQ_STATUSES)[number]] : undefined,
      priority: priority !== "all" ? [priority as (typeof REQ_PRIORITIES)[number]] : undefined,
      page,
      page_size: pageSize,
    }),
    [search, status, priority, page],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["requirements", query],
    queryFn: () => listFn({ data: query }),
    placeholderData: (prev) => prev,
  });

  const combinedRows = useMemo(() => {
    let rows = [...(data?.rows ?? [])] as any[];

    // Sort
    rows = [...rows].sort((a, b) => {
      if (sortBy === "title_asc") return a.title.localeCompare(b.title);
      if (sortBy === "title_desc") return b.title.localeCompare(a.title);
      if (sortBy === "client_asc") return (a.client_name ?? "").localeCompare(b.client_name ?? "");
      if (sortBy === "rate_desc") return (b.rate_max ?? 0) - (a.rate_max ?? 0);
      if (sortBy === "created_desc")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });
    return rows;
  }, [data?.rows, sortBy]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const paginatedRows = combinedRows;

  return (
    <>
      <AppTopbar title="Requisitions" />
      <main className="flex-1 space-y-6 p-6 md:p-8">
        <PageHeader
          title="Requisitions"
          description="Manage open client job requisitions, required skills, visa categories, rates, and reviews."
          actions={
            <Button size="sm" asChild>
              <Link to="/requirements/new">
                <Plus className="mr-1.5 h-4 w-4" /> New Requisition
              </Link>
            </Button>
          }
        />

        {/* Filters & Sorting Strip */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, vendor, client, skills…"
              className="pl-8 text-xs"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setPage(1);
              setStatus(v);
            }}
          >
            <SelectTrigger className="w-36 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {REQ_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={priority}
            onValueChange={(v) => {
              setPage(1);
              setPriority(v);
            }}
          >
            <SelectTrigger className="w-36 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {REQ_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44 text-xs">
              <ArrowUpDown className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Newest First</SelectItem>
              <SelectItem value="title_asc">Title (A-Z)</SelectItem>
              <SelectItem value="title_desc">Title (Z-A)</SelectItem>
              <SelectItem value="client_asc">Client Name</SelectItem>
              <SelectItem value="rate_desc">Highest Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requisitions Table */}
        <div className="rounded-lg border border-border bg-card shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading requisitions…
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-destructive">{(error as Error).message}</div>
          ) : combinedRows.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Job Title & Main Skills</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Visa</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div className="font-semibold text-sm text-foreground">{r.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.skills.slice(0, 4).map((s: any, idx: number) => {
                          const skillText = typeof s === "string" ? s : s.skill;
                          const skillKey =
                            typeof s === "string" ? `${s}-${idx}` : s.id || `${s.skill}-${idx}`;
                          return (
                            <Badge
                              key={skillKey}
                              variant="secondary"
                              className="bg-primary/10 text-[10px] text-primary border-0 font-normal px-1.5 py-0"
                            >
                              {skillText}
                            </Badge>
                          );
                        })}
                        {r.skills.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{r.skills.length - 4}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-xs text-foreground">{r.vendor_name}</div>
                      <div className="text-[11px] text-muted-foreground flex flex-col gap-0.5 mt-0.5">
                        <span>{r.vendor_email}</span>
                        <span>{r.vendor_contact}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      {r.client_name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                        {r.location}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {r.visa_required}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">
                      ${r.rate_min} - ${r.rate_max}/hr
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-normal capitalize text-[10px]",
                          STATUS_STYLES[r.status] || STATUS_STYLES.open,
                        )}
                      >
                        {STATUS_LABEL[r.status] || STATUS_LABEL.open}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-normal capitalize text-[10px]",
                          PRIORITY_STYLES[r.priority],
                        )}
                      >
                        {PRIORITY_LABEL[r.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {r.status === "open" && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
                          >
                            <Link to="/matching" search={{ reqId: r.id }}>
                              <Sparkles className="h-3.5 w-3.5" />
                              AI Matching
                            </Link>
                          </Button>
                        )}
                        <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                          <Link to="/requirements/$id" params={{ id: r.id }}>
                            <Eye className="h-3.5 w-3.5" />
                            Review
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Slide-Over Review Drawer */}
        <Sheet open={!!reviewReq} onOpenChange={(open) => !open && setReviewReq(null)}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6 space-y-6">
            {reviewReq && (
              <>
                <SheetHeader className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", STATUS_STYLES[reviewReq.status])}
                    >
                      {STATUS_LABEL[reviewReq.status]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", PRIORITY_STYLES[reviewReq.priority])}
                    >
                      {PRIORITY_LABEL[reviewReq.priority]} Priority
                    </Badge>
                  </div>
                  <SheetTitle className="text-xl font-bold text-foreground">
                    {reviewReq.title}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Requisition ID: {reviewReq.id} · Created{" "}
                    {formatDistanceToNow(new Date(reviewReq.created_at), { addSuffix: true })}
                  </SheetDescription>
                </SheetHeader>

                {/* Key Overview Grid */}
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface p-4 text-xs">
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Building className="h-3.5 w-3.5 text-primary" /> Client:
                    </span>
                    <p className="font-semibold text-foreground mt-0.5">{reviewReq.client_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Location:
                    </span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {reviewReq.location} ({reviewReq.work_model})
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-primary" /> Engagement:
                    </span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {reviewReq.engagement_type} ({reviewReq.duration})
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-primary" /> Rate:
                    </span>
                    <p className="font-semibold text-foreground mt-0.5">
                      ${reviewReq.rate_min} - ${reviewReq.rate_max}/hr
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Visa Required:
                    </span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {reviewReq.visa_required}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Start Date:
                    </span>
                    <p className="font-semibold text-foreground mt-0.5">{reviewReq.start_date}</p>
                  </div>
                </div>

                {/* Vendor Details Box */}
                <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-xs">
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                    Vendor Partner
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">{reviewReq.vendor_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {reviewReq.vendor_email}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {reviewReq.vendor_contact}
                    </div>
                  </div>
                </div>

                {/* Required Skills */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-foreground">Primary Required Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(reviewReq.skills ?? []).map((s: string) => (
                      <Badge
                        key={s}
                        className="bg-primary/10 text-primary border-primary/20 text-xs"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Secondary Skills & Experience */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Secondary Skills</h4>
                    <p className="text-muted-foreground">
                      {(reviewReq.secondary_skills ?? []).join(", ") || "—"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Min. Experience & Certs</h4>
                    <p className="text-muted-foreground">
                      {reviewReq.min_experience} · {reviewReq.certifications}
                    </p>
                  </div>
                </div>

                {/* Job Description */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-foreground">Job Description</h4>
                  <div className="rounded-md border border-border bg-surface p-3 text-xs text-muted-foreground leading-relaxed">
                    {reviewReq.description}
                  </div>
                </div>

                <SheetFooter className="pt-4 border-t border-border flex-col sm:flex-row gap-2">
                  <Button
                    className="w-full sm:flex-1 gap-2 text-xs"
                    onClick={() => {
                      setReviewReq(null);
                      navigate({ to: "/matching" });
                    }}
                  >
                    <Sparkles className="h-4 w-4" /> Go To AI Matching
                  </Button>
                </SheetFooter>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, combinedRows.length)} of{" "}
            {combinedRows.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="rounded-full bg-primary/10 p-3 text-primary">
        <FileText className="h-5 w-5" />
      </div>
      <div>
        <p className="font-medium">No requisitions match filters</p>
        <p className="text-sm text-muted-foreground">
          Try clearing your search or add a new requisition.
        </p>
      </div>
      <Button size="sm" asChild>
        <Link to="/requirements/new">
          <Plus className="mr-1.5 h-4 w-4" /> New Requisition
        </Link>
      </Button>
    </div>
  );
}
