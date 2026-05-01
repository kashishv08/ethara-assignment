import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getApiErrorMessage, getToken, setToken } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<{ user: User }>("/auth/me");
      setUser(data.user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { data } = await api.post<{ token: string; user: User }>(
          "/auth/login",
          { email, password },
        );
        setToken(data.token);
        setUser(data.user);
        return data.user;
      } catch (err) {
        throw new Error(getApiErrorMessage(err));
      }
    },
    [],
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const { data } = await api.post<{ token: string; user: User }>(
          "/auth/signup",
          { name, email, password },
        );
        setToken(data.token);
        setUser(data.user);
        return data.user;
      } catch (err) {
        throw new Error(getApiErrorMessage(err));
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, signup, logout, refresh }),
    [user, loading, login, signup, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
