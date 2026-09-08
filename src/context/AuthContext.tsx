import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API_BASE_URL } from "../config/api";
import type { AuthRole } from "../config/permissions";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
};

type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    role?: AuthRole;
  }) => Promise<void>;
  logout: () => void;
};

const storageKey = "property-management-auth";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readApiResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: `API returned ${response.status} ${response.statusText || "without JSON"}`,
    };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const storeSession = useCallback((auth: AuthResponse) => {
    setUser(auth.user);
    setToken(auth.accessToken);
    setRefreshToken(auth.refreshToken);
    localStorage.setItem(storageKey, JSON.stringify(auth));
  }, []);

  const logout = useCallback(() => {
    const storedSession = localStorage.getItem(storageKey);

    if (storedSession) {
      try {
        const auth = JSON.parse(storedSession) as AuthResponse;
        void fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken: auth.refreshToken }),
        });
      } catch {
        localStorage.removeItem(storageKey);
      }
    }

    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem(storageKey);
  }, []);

  useEffect(() => {
    const storedSession = localStorage.getItem(storageKey);

    if (!storedSession) {
      setIsLoading(false);
      return;
    }

    try {
      const auth = JSON.parse(storedSession) as AuthResponse;
      setUser(auth.user);
      setToken(auth.accessToken);
      setRefreshToken(auth.refreshToken);
    } catch {
      localStorage.removeItem(storageKey);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to sign in");
      }

      storeSession(data);
    },
    [storeSession]
  );

  const register = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      role?: AuthRole;
    }) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...input, role: input.role ?? "MANAGER" }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to create account");
      }

      storeSession(data);
    },
    [storeSession]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      refreshToken,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login,
      register,
      logout,
    }),
    [isLoading, login, logout, refreshToken, register, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
