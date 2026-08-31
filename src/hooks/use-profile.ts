import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authService, UserProfile } from "@/lib/auth-service";

export function useProfile() {
  const qc = useQueryClient();
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());

  useEffect(() => {
    const unsubscribe = authService.subscribe((updated) => {
      setUser(updated);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["tenancy"] });
    });
    return unsubscribe;
  }, [qc]);

  return useQuery({
    queryKey: ["me", user?.id],
    queryFn: () => {
      const active = user || authService.getCurrentUser();
      return {
        profile: {
          id: active?.id ?? "usr-default",
          full_name: active?.fullName ?? "Manideep (Recruiter)",
          email: active?.email ?? "manideepstaff@gmail.com",
          avatar_url: null,
        },
        roles: active?.roles ?? ["recruiter"],
        email: active?.email ?? "manideepstaff@gmail.com",
        userId: active?.id ?? "usr-default",
        level: active?.roleLevel ?? "L4",
        roleTitle: active?.roleTitle ?? "L4 Recruiter",
      };
    },
    staleTime: 60_000,
  });
}
