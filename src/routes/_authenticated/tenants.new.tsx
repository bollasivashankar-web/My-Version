import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { AppTopbar } from "@/components/app-shell/topbar";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTenant } from "@/lib/tenancy.functions";

export const Route = createFileRoute("/_authenticated/tenants/new")({
  head: () => ({ meta: [{ title: "New Tenant — Staffinix" }] }),
  component: NewTenantPage,
});

function NewTenantPage() {
  const navigate = useNavigate();
  const createTenantFn = useServerFn(createTenant);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [plan, setPlan] = useState<"trial" | "starter" | "growth" | "enterprise">("trial");
  const [seatLimit, setSeatLimit] = useState(10);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await createTenantFn({
        data: {
          name,
          slug,
          industry: industry || null,
          website: website || null,
          primary_contact_email: contactEmail || null,
          plan,
          status: plan === "trial" ? "trialing" : "active",
          seat_limit: seatLimit,
        },
      });
      toast.success("Tenant created");
      navigate({ to: "/platform" });
    } catch {
      toast.error("Tenant could not be created");
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <AppTopbar title="New Tenant" />
      <main className="flex-1 space-y-6 p-6 md:p-8">
        <PageHeader
          title="New Tenant"
          description="Create a tenant using fields stored by the production administration API."
        />
        <form onSubmit={handleSubmit}>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-primary" /> Tenant details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <Field label="Name" required>
                <Input required value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field label="Slug" required>
                <Input
                  required
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder="acme-staffing"
                />
              </Field>
              <Field label="Industry">
                <Input value={industry} onChange={(event) => setIndustry(event.target.value)} />
              </Field>
              <Field label="Website">
                <Input
                  type="url"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  placeholder="https://example.com"
                />
              </Field>
              <Field label="Primary contact email">
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                />
              </Field>
              <Field label="Plan">
                <Select value={plan} onValueChange={(value) => setPlan(value as typeof plan)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">trial</SelectItem>
                    <SelectItem value="starter">starter</SelectItem>
                    <SelectItem value="growth">growth</SelectItem>
                    <SelectItem value="enterprise">enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Seat limit" required>
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  required
                  value={seatLimit}
                  onChange={(event) => setSeatLimit(Number(event.target.value))}
                />
              </Field>

              <div className="flex items-center justify-between gap-3 border-t border-border pt-5 md:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: "/platform" })}
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  {isSubmitting ? "Creating…" : "Create tenant"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </main>
    </>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
