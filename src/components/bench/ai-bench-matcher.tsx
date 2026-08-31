import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type MatchCard = {
  name: string;
  role: string;
  score: number;
  visa: string;
  location: string;
  skills: string[];
  ineligible?: string;
};

const MATCHES: MatchCard[] = [
  {
    name: "Arjun Mehta",
    role: "Sr. Platform Engineer",
    score: 98,
    visa: "Green Card",
    location: "Austin, TX · Hybrid",
    skills: ["Kubernetes", "Go", "AWS EKS", "ArgoCD"],
  },
  {
    name: "Priya Nair",
    role: "ML Infrastructure Engineer",
    score: 91,
    visa: "US Citizen",
    location: "Remote",
    skills: ["Python", "vLLM", "Ray", "Kubernetes"],
  },
  {
    name: "Kenji Watanabe",
    role: "Sr. Backend Engineer",
    score: 94,
    visa: "US Citizen",
    location: "Seattle, WA",
    skills: ["Go", "gRPC", "PostgreSQL", "Kafka"],
  },
  {
    name: "Daniel Okoye",
    role: "Platform SRE",
    score: 87,
    visa: "GC-EAD",
    location: "San Francisco, CA",
    skills: ["Terraform", "AWS IAM", "Prometheus"],
  },
  {
    name: "Sofia Álvarez",
    role: "Full-Stack Engineer",
    score: 89,
    visa: "US Citizen",
    location: "Remote",
    skills: ["React", "TypeScript", "Go", "Postgres"],
  },
  {
    name: "Rahul Sharma",
    role: "Cloud Engineer",
    score: 76,
    visa: "H-1B",
    location: "Dallas, TX",
    skills: ["AWS", "Docker", "Jenkins"],
    ineligible: "Ineligible: H-1B Visa does not match requirement.",
  },
];

export function AiBenchMatcher() {
  const blocked = MATCHES.filter((m) => m.ineligible);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> AI bench matcher
          </h2>
          <p className="text-xs text-muted-foreground">
            Ranked against <span className="text-foreground/80">Sr. AI Software Engineer</span> · GC
            / US Citizen · Hybrid — San Francisco
          </p>
        </div>
        <Button variant="outline" size="sm">
          Re-run match
        </Button>
      </div>

      {blocked.length > 0 && (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{blocked.length} candidate excluded by hard filters</AlertTitle>
          <AlertDescription>{blocked.map((b) => b.ineligible).join(" ")}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MATCHES.map((m) => (
          <Card
            key={m.name}
            className={cn(
              "transition-all duration-200",
              m.ineligible
                ? "border-destructive/30 opacity-60 saturate-50"
                : "hover:-translate-y-0.5 hover:border-primary/40",
            )}
          >
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-surface-2 text-xs">
                    {m.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    m.ineligible
                      ? "border-border text-muted-foreground"
                      : "border-primary/50 bg-primary/15 text-primary shadow-[0_0_16px_-4px_var(--primary-glow)]",
                  )}
                >
                  {m.score}%
                </Badge>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                <span className="rounded border border-border px-1.5 py-0.5">{m.visa}</span>
                <span className="rounded border border-border px-1.5 py-0.5">{m.location}</span>
              </div>

              <div className="flex flex-wrap gap-1">
                {m.skills.map((s) => (
                  <Badge key={s} variant="outline" className="text-[10px]">
                    {s}
                  </Badge>
                ))}
              </div>

              {m.ineligible && (
                <Badge
                  variant="outline"
                  className="w-full justify-center border-destructive/40 bg-destructive/15 text-[10px] text-destructive"
                >
                  {m.ineligible}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
