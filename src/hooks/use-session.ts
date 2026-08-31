import { useEffect, useState } from "react";
import { authService, UserProfile } from "@/lib/auth-service";

let signingOut = false;
const signOutListeners = new Set<(value: boolean) => void>();

function setSigningOut(value: boolean) {
  signingOut = value;
  signOutListeners.forEach((listener) => listener(value));
}

export function beginSignOut() {
  setSigningOut(true);
}

export function cancelSignOut() {
  setSigningOut(false);
}

export function useSession() {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [isSigningOut, setIsSigningOut] = useState(signingOut);

  useEffect(() => {
    signOutListeners.add(setIsSigningOut);
    const unsubscribe = authService.subscribe((updated) => {
      setUser(updated);
      setSigningOut(false);
    });
    return () => {
      signOutListeners.delete(setIsSigningOut);
      unsubscribe();
    };
  }, []);

  return {
    user,
    session: user ? ({ user: { id: user.id, email: user.email } } as any) : null,
    ready: true,
    isSigningOut,
    isAuthenticated: Boolean(user) && !isSigningOut,
  };
}
