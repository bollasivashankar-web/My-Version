import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { AppTopbar } from "@/components/app-shell/topbar";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listTenants, updateTenant } from "@/lib/tenancy.functions";

const PLANS = ["trial", "starter", "growth", "enterprise"] as const;
const STATUSES = ["active", "trialing", "suspended", "cancelled"] as const;

export const Route = createFileRoute("/_authenticated/platform")({
  head: () => ({ meta: [{ title: "Platform Console — Staffinix" }] }),
  component: PlatformConsole,
});

function PlatformConsole() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listTenants);
  const updateFn = useServerFn(updateTenant);
  const tenantsQuery = useQuery({
    queryKey: ["platform", "tenants"],
    queryFn: () => listFn(),
  });
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { plan?: (typeof PLANS)[number]; status?: (typeof STATUSES)[number] };
    }) => updateFn({ data: { id, patch } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
      toast.success("Tenant updated");
    },
    onError: () => toast.error("Tenant could not be updated"),
  });

  const tenants = tenantsQuery.data?.tenants ?? [];

  return (
    <>
      <AppTopbar title="Platform Console" />
      <main className="flex-1 space-y-5 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeader
            title="Platform Console"
            description="Live tenant records from the Staffinix database."
          />
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/tenants/new">
              <Plus className="h-4 w-4" /> New tenant
            </Link>
          </Button>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                )}
                {tenantsQuery.isError && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      role="alert"
                      className="h-32 text-center text-destructive"
                    >
                      Tenant data could not be loaded.
                    </TableCell>
                  </TableRow>
                )}
                {!tenantsQuery.isLoading && !tenantsQuery.isError && tenants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No tenants recorded.
                    </TableCell>
                  </TableRow>
                )}
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{tenant.industry || "Not recorded"}</TableCell>
                    <TableCell>{tenant.primary_contact_email || "Not recorded"}</TableCell>
                    <TableCell>
                      <Select
                        value={tenant.plan}
                        disabled={updateMutation.isPending}
                        onValueChange={(plan) =>
                          updateMutation.mutate({
                            id: tenant.id,
                            patch: { plan: plan as (typeof PLANS)[number] },
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLANS.map((plan) => (
                            <SelectItem key={plan} value={plan}>
                              {plan}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={tenant.status}
                        disabled={updateMutation.isPending}
                        onValueChange={(status) =>
                          updateMutation.mutate({
                            id: tenant.id,
                            patch: { status: status as (typeof STATUSES)[number] },
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{tenant.seat_limit}</Badge>
                    </TableCell>
                    <TableCell>
                      {tenant.created_at
                        ? new Date(tenant.created_at).toLocaleDateString()
                        : "Not recorded"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
