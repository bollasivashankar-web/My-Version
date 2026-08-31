import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppTopbar } from "@/components/app-shell/topbar";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, User, Sparkles, Loader2 } from "lucide-react";
import { createCandidate } from "@/lib/candidates.functions";

export const Route = createFileRoute("/_authenticated/candidates/new")({
  head: () => ({ meta: [{ title: "Add New Candidate — Staffinix" }] }),
  component: NewCandidatePage,
});

function NewCandidatePage() {
  const navigate = useNavigate();

  return (
    <>
      <AppTopbar title="Add New Candidate" />
      <main className="flex-1 space-y-6 p-6 md:p-8 w-full max-w-2xl mx-auto flex flex-col items-center">
        <div className="flex items-center gap-2 w-full">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/candidates">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Bench Candidates
            </Link>
          </Button>
        </div>

        <PageHeader
          title="Add New Candidate"
          description="Fill in candidate details to add them to the Bench Candidates repository."
        />

        <div className="w-full">
          <CandidateFormCard onCreated={() => navigate({ to: "/candidates" })} />
        </div>
      </main>
    </>
  );
}

function CandidateFormCard({ onCreated }: { onCreated: () => void }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [techSkills, setTechSkills] = useState("");
  const [expYears, setExpYears] = useState("");
  const [location, setLocation] = useState("");
  const [visa, setVisa] = useState("H1B");
  const [availability, setAvailability] = useState("immediate");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createFn = useServerFn(createCandidate);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!first.trim() || !last.trim()) {
      toast.error("First Name and Last Name are required!");
      return;
    }

    setIsSubmitting(true);

    const skillsArray = techSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await createFn({
        data: {
          first_name: first.trim(),
          last_name: last.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          current_title: jobRole.trim() || null,
          primary_technology: skillsArray[0] ?? null,
          visa_status: visa || null,
          experience_years: expYears ? Number(expYears) : null,
          location: location.trim() || null,
          availability: availability as "immediate" | "two_weeks" | "one_month" | "negotiable",
          status: "active",
          source: "manual",
          skills: skillsArray.map((skill, index) => ({
            skill,
            is_primary: index === 0,
          })),
          employment: [],
          education: [],
          projects: [],
          certifications: [],
        },
      });
      setIsSubmitting(false);
      toast.success("Bench candidate added!");
      onCreated();
    } catch {
      setIsSubmitting(false);
      toast.error("Candidate could not be saved. Please review the form and try again.");
    }
  }

  return (
    <Card className="border-border bg-card w-full shadow-sm">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <User className="h-4.5 w-4.5 text-primary" /> Candidate Details
        </CardTitle>
        <CardDescription className="text-xs">
          Fill out all required details to register candidate in the bench database.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* First & Last Name */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">First Name *</Label>
              <Input
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                placeholder="e.g. Alex"
                required
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Last Name *</Label>
              <Input
                value={last}
                onChange={(e) => setLast(e.target.value)}
                placeholder="e.g. Vance"
                required
                className="text-xs"
              />
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. alex.vance@techbench.io"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Phone Number</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (555) 987-6543"
                className="text-xs"
              />
            </div>
          </div>

          {/* Job Role & Tech/Skills */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Job Role *</Label>
              <Input
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. Senior Full Stack Developer"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tech / Skills (Comma-separated)</Label>
              <Input
                value={techSkills}
                onChange={(e) => setTechSkills(e.target.value)}
                placeholder="e.g. React, TypeScript, Node.js, GraphQL"
                className="text-xs"
              />
            </div>
          </div>

          {/* Years of Experience & Location */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Years of Experience</Label>
              <Input
                type="number"
                value={expYears}
                onChange={(e) => setExpYears(e.target.value)}
                placeholder="e.g. 8"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Jersey City, NJ"
                className="text-xs"
              />
            </div>
          </div>

          {/* Work Authorization & Bench Availability Dropdowns */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Work Authorization / Visa Status *</Label>
              <Select value={visa} onValueChange={setVisa}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Visa Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="H1B">H1B Visa</SelectItem>
                  <SelectItem value="Green Card">Green Card</SelectItem>
                  <SelectItem value="US Citizen">US Citizen</SelectItem>
                  <SelectItem value="OPT-STEM">OPT-STEM</SelectItem>
                  <SelectItem value="TN Visa">TN Visa</SelectItem>
                  <SelectItem value="C2C">C2C</SelectItem>
                  <SelectItem value="EAD">EAD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Bench Availability *</Label>
              <Select value={availability} onValueChange={setAvailability}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Bench Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate Start</SelectItem>
                  <SelectItem value="two_weeks">2 Weeks Notice</SelectItem>
                  <SelectItem value="one_month">1 Month Notice</SelectItem>
                  <SelectItem value="negotiable">Negotiable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" size="sm" asChild>
              <Link to="/candidates">Cancel</Link>
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-2 bg-primary text-primary-foreground font-semibold"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Add Candidate
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
