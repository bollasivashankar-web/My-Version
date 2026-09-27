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
import { ArrowLeft, User, Sparkles, Loader2, FileUp } from "lucide-react";
import {
  createCandidate,
  createCandidateResumeUpload,
  createCandidateWithResume,
} from "@/lib/candidates.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/candidates/new")({
  head: () => ({ meta: [{ title: "Add New Candidate — Staffinix" }] }),
  component: NewCandidatePage,
});

function NewCandidatePage() {
  const navigate = useNavigate();

  return (
    <>
      <AppTopbar title="Add New Candidate" />
      <main className="flex-1 space-y-6 p-6 md:p-8 w-full max-w-4xl mx-auto flex flex-col items-center">
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
  const [currentJob, setCurrentJob] = useState("");
  const [requiredJob, setRequiredJob] = useState("");
  const [techSkills, setTechSkills] = useState("");
  const [expYears, setExpYears] = useState("");
  const [location, setLocation] = useState("");
  const [visa, setVisa] = useState("H1B");
  const [availability, setAvailability] = useState("immediate");
  const [readyToRelocate, setReadyToRelocate] = useState("yes");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createFn = useServerFn(createCandidate);
  const createWithResumeFn = useServerFn(createCandidateWithResume);
  const createUploadFn = useServerFn(createCandidateResumeUpload);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!first.trim() || !last.trim() || !currentJob.trim() || !requiredJob.trim()) {
      toast.error("First name, last name, current job, and required job are required.");
      return;
    }
    if (readyToRelocate === "no" && !preferredLocation.trim()) {
      toast.error("Enter a preferred location when the candidate is not ready to relocate.");
      return;
    }

    setIsSubmitting(true);

    const skillsArray = techSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const candidate = {
        first_name: first.trim(),
        last_name: last.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        current_title: currentJob.trim(),
        required_job: requiredJob.trim(),
        ready_to_relocate: readyToRelocate === "yes",
        preferred_location: readyToRelocate === "no" ? preferredLocation.trim() : null,
        primary_technology: skillsArray[0] ?? null,
        visa_status: visa || null,
        experience_years: expYears ? Number(expYears) : null,
        location: location.trim() || null,
        availability: availability as "immediate" | "two_weeks" | "one_month" | "negotiable",
        status: "active" as const,
        source: "manual" as const,
        currency: "USD",
        skills: skillsArray.map((skill, index) => ({
          skill,
          is_primary: index === 0,
        })),
        employment: [],
        education: [],
        projects: [],
        certifications: [],
      };

      if (resumeFile) {
        if (resumeFile.size < 1 || resumeFile.size > 10 * 1024 * 1024) {
          throw new Error("Resume must be between 1 byte and 10 MiB.");
        }
        const lowerName = resumeFile.name.toLowerCase();
        const mimeType = lowerName.endsWith(".pdf")
          ? "application/pdf"
          : lowerName.endsWith(".docx")
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : null;
        if (!mimeType) throw new Error("Resume must be a PDF or DOCX file.");

        const grant = await createUploadFn({
          data: {
            file_name: resumeFile.name,
            mime_type: mimeType,
            size_bytes: resumeFile.size,
          },
        });
        const { error: uploadError } = await supabase.storage
          .from("resume-uploads")
          .uploadToSignedUrl(grant.path, grant.token, resumeFile, { contentType: mimeType });
        if (uploadError) throw new Error(`Resume upload failed: ${uploadError.message}`);

        await createWithResumeFn({
          data: { candidate, upload_id: grant.upload_id },
        });
      } else {
        await createFn({ data: candidate });
      }

      toast.success("Bench candidate added!");
      onCreated();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Candidate could not be saved. Please review the form and try again.",
      );
    } finally {
      setIsSubmitting(false);
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

          {/* Current and required jobs */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Current Job *</Label>
              <Input
                value={currentJob}
                onChange={(e) => setCurrentJob(e.target.value)}
                placeholder="e.g. Senior Full Stack Developer"
                required
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Required Job *</Label>
              <Input
                value={requiredJob}
                onChange={(e) => setRequiredJob(e.target.value)}
                placeholder="e.g. Engineering Lead"
                required
                className="text-xs"
              />
            </div>
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

          {/* Relocation preference */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ready to Relocate? *</Label>
              <Select value={readyToRelocate} onValueChange={setReadyToRelocate}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select relocation preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {readyToRelocate === "no" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Preferred Location *</Label>
                <Input
                  value={preferredLocation}
                  onChange={(e) => setPreferredLocation(e.target.value)}
                  placeholder="e.g. Dallas, TX or Remote"
                  required
                  className="text-xs"
                />
              </div>
            )}
          </div>

          {/* Resume upload */}
          <div className="space-y-1.5">
            <Label htmlFor="candidate-resume" className="text-xs font-semibold">
              Upload Resume
            </Label>
            <div className="rounded-md border border-dashed border-border p-4">
              <div className="flex items-center gap-3">
                <FileUp className="h-5 w-5 text-primary" />
                <Input
                  id="candidate-resume"
                  type="file"
                  accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                  onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
                  className="text-xs"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                PDF or DOCX, up to 10 MiB.
                {resumeFile
                  ? ` Selected: ${resumeFile.name} (${(resumeFile.size / 1024).toFixed(0)} KB)`
                  : ""}
              </p>
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
