"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type View = "login" | "forgot" | "forgot-sent";

export default function LoginPage() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "archived") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot read from URL after mount
      setError("Dieser Account wurde archiviert. Bitte wende dich an einen Administrator.");
    }
  }, []);

  // Handle invite/recovery tokens in URL hash (Supabase implicit flow)
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.substring(1));
    const type = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (type === "invite" || type === "recovery" || type === "magiclink") {
      if (!accessToken || !refreshToken) return;

      const supabase = createClient();

      // Manually set the session from hash tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data, error: sessionError }) => {
        if (sessionError) return;
        if (data.session) {
          window.location.href = "/login/reset";
        }
      });
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await loginAction(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/login/reset` }
      );

      if (resetError) {
        setError("Anfrage fehlgeschlagen. Bitte versuchen Sie es erneut.");
        return;
      }

      setView("forgot-sent");
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Anmelden</CardTitle>
          <CardDescription>
            {view === "login" && "Melden Sie sich mit Ihren Zugangsdaten an."}
            {view === "forgot" && "Geben Sie Ihre E-Mail-Adresse ein."}
            {view === "forgot-sent" && "E-Mail wurde gesendet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@firma.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Passwort</Label>
                  <button
                    type="button"
                    onClick={() => { setError(null); setView("forgot"); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Passwort vergessen?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Anmelden..." : "Anmelden"}
              </Button>
            </form>
          )}

          {view === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-Mail</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@firma.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Senden..." : "Link zum Zurücksetzen senden"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setError(null); setView("login"); }}
              >
                Zurück zum Login
              </Button>
            </form>
          )}

          {view === "forgot-sent" && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Falls ein Konto mit dieser E-Mail-Adresse existiert, erhalten Sie
                in Kürze eine E-Mail mit einem Link zum Zurücksetzen Ihres Passworts.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setError(null); setView("login"); }}
              >
                Zurück zum Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
