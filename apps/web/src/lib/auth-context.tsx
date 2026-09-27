"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, apiErrorMessage } from "./api";
import type { LoginResponse, Usuario } from "./types";

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "agritrack_token";
const USUARIO_KEY = "agritrack_usuario";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const raw = window.localStorage.getItem(USUARIO_KEY);
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (raw && token) {
      try {
        // localStorage solo existe en el cliente: leerlo debe pasar por un
        // efecto (no por el render inicial) para no romper la hidratacion.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUsuario(JSON.parse(raw));
      } catch {
        window.localStorage.removeItem(USUARIO_KEY);
        window.localStorage.removeItem(TOKEN_KEY);
      }
    }
    setCargando(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });
      window.localStorage.setItem(TOKEN_KEY, data.accessToken);
      window.localStorage.setItem(USUARIO_KEY, JSON.stringify(data.usuario));
      setUsuario(data.usuario);
    } catch (error) {
      throw new Error(apiErrorMessage(error, "No se pudo iniciar sesion"));
    }
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USUARIO_KEY);
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
