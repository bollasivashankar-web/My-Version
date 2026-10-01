import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Briefcase,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
} from "lucide-react";

import { AppTopbar } from "@/components/app-shell/topbar";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCandidate } from "@/lib/candidates.functions";

export const Route = createFileRoute("/_authenticated/candidates/$id")({
  head: () => ({ meta: [{ title: "Candidate Profile — Staffinix" }] }),
  component: CandidateDetailPage,
});

function CandidateDetailPage() {
  const { id } = Route.useParams();
  const getCandidateFn = useServerFn(getCandidate);
  const candidateQuery = useQuery({
    queryKey: ["candidate", id],
    queryFn: () => getCandidateFn({ data: { id } }),
  });

  if (candidateQuery.isLoading) {
    return <CandidateState message="Loading candidate…" loading />;
  }

  if (candidateQuery.isError || !candidateQuery.data) {
    return <CandidateState message="Candidate data could not be loaded." error />;
  }

  const candidate = candidateQuery.data;

  return (
    <>
      <AppTopbar title={`${candidate.first_name} ${candidate.last_name}`} />
      <main className="flex-1 space-y-6 p-6 md:p-8">
        <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
          <Link to="/candidates">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Bench Candidates
          </Link>
        </Button>

        <PageHeader
          title={`${candidate.first_name} ${candidate.last_name}`}
          description={
            [candidate.current_title, candidate.location].filter(Boolean).join(" · ") ||
            "Candidate profile"
          }
          actions={
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/candidates/$id/edit" params={{ id }}>
                <Pencil className="h-3.5 w-3.5" /> Edit Candidate
              </Link>
            </Button>
          }
        />

        <Card className="border-border bg-card">
          <CardContent className="grid gap-4 p-6 md:grid-cols-3">
            <Detail label="Current role" value={candidate.current_title} />
            <div className="space-y-1 text-xs">
              <p className="font-semibold uppercase tracking-wider text-muted-foreground">
                Contact
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" /> {candidate.email || "Not recorded"}
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" /> {candidate.phone || "Not recorded"}
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />{" "}
                {candidate.location || "Not recorded"}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{candidate.status}</Badge>
                {candidate.visa_status && (
                  <Badge variant="secondary">{candidate.visa_status}</Badge>
                )}
                {candidate.availability && (
                  <Badge variant="secondary">{candidate.availability.replaceAll("_", " ")}</Badge>
                )}
                {(candidate.marketing_types ?? []).map((type) => (
                  <Badge key={type} variant="outline">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm">Skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {candidate.skills.map((item) => (
                <Badge key={item.id} variant="outline">
                  {item.skill}
                </Badge>
              ))}
              {candidate.skills.length === 0 && <EmptyText>No skills recorded.</EmptyText>}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm">Resume files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {candidate.resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="flex items-center gap-2 rounded-md border border-border p-3 text-xs"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  <span>{resume.file_name}</span>
                </div>
              ))}
              {candidate.resumes.length === 0 && <EmptyText>No resume uploaded.</EmptyText>}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4" /> Employment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {candidate.employment.map((job) => (
                <div key={job.id} className="rounded-md border border-border p-3 text-xs">
                  <p className="font-semibold">{job.title || "Role not recorded"}</p>
                  <p className="text-muted-foreground">{job.company}</p>
                </div>
              ))}
              {candidate.employment.length === 0 && (
                <EmptyText>No employment history recorded.</EmptyText>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <GraduationCap className="h-4 w-4" /> Education
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {candidate.education.map((education) => (
                <div key={education.id} className="rounded-md border border-border p-3 text-xs">
                  <p className="font-semibold">{education.degree || "Degree not recorded"}</p>
                  <p className="text-muted-foreground">{education.institution}</p>
                </div>
              ))}
              {candidate.education.length === 0 && (
                <EmptyText>No education history recorded.</EmptyText>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

function CandidateState({
  message,
  loading = false,
  error = false,
}: {
  message: string;
  loading?: boolean;
  error?: boolean;
}) {
  return (
    <>
      <AppTopbar title="Candidate" />
      <main className="flex-1 p-6 md:p-8">
        <Card role={error ? "alert" : "status"} className="border-border bg-card">
          <CardContent
            className={
              error
                ? "p-10 text-center text-sm text-destructive"
                : "p-10 text-center text-sm text-muted-foreground"
            }
          >
            {loading && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
            {message}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value ?? "Not recorded"}</p>
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-xs text-muted-foreground">{children}</p>;
}
