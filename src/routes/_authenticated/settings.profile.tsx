import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppTopbar } from "@/components/app-shell/topbar";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { updateMyProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  head: () => ({ meta: [{ title: "Profile — Staffinix" }] }),
  component: ProfileSettingsPage,
});

function ProfileSettingsPage() {
  const { data } = useProfile();
  const qc = useQueryClient();
  const updateFn = useServerFn(updateMyProfile);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [personalEmail, setPersonalEmail] = useState("");

  useEffect(() => {
    if (data?.profile) {
      setFullName(data.profile.full_name ?? "");
      setPhone(data.profile.phone ?? "");
      setAvatarUrl(data.profile.avatar_url ?? "");
    }
  }, [data?.profile]);

  const mutation = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          full_name: fullName,
          phone: phone || null,
          avatar_url: avatarUrl || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile updated");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const initials =
    fullName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    data?.email?.[0]?.toUpperCase() ||
    "?";

  return (
    <>
      <AppTopbar title="Profile" />
      <main className="flex-1 space-y-6 p-6 md:p-8 flex flex-col items-center">
        <div className="w-full max-w-2xl">
          <PageHeader title="Profile" description="Update your personal details." />
        </div>

        <Card className="w-full max-w-2xl border-border bg-card shadow-sm">
          <CardContent className="p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              className="space-y-5"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-primary/20 shrink-0">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/20 text-lg font-bold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="avatar">Avatar URL</Label>
                  <Input
                    id="avatar"
                    placeholder="https://…"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Company Email ID</Label>
                  <Input
                    value={data?.email ?? ""}
                    disabled
                    className="bg-muted/50 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="personalEmail">Personal Email ID</Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    placeholder="e.g. personal.email@gmail.com"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Roles</Label>
                <div className="flex flex-wrap gap-1.5">
                  {data?.roles?.map((r) => (
                    <span
                      key={r}
                      className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-mono text-muted-foreground capitalize"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
