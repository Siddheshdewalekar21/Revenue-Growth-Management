import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const mockUser = {
  id: "mock-id-123",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as User;

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => { },
  signOut: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for mock session
    const storedAuth = localStorage.getItem("rgm_mock_auth");
    if (storedAuth) {
      setUser({ ...mockUser, email: storedAuth });
      setSession({ user: { ...mockUser, email: storedAuth } } as Session);
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string) => {
    localStorage.setItem("rgm_mock_auth", email);
    setUser({ ...mockUser, email });
    setSession({ user: { ...mockUser, email } } as Session);
  };

  const signOut = async () => {
    localStorage.removeItem("rgm_mock_auth");
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
