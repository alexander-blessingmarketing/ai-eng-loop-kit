"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError("Passwort konnte nicht geändert werden. Der Link ist möglicherweise abgelaufen.");
        return;
      }

      setSuccess(true);
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
          <CardTitle className="text-2xl font-bold">Neues Passwort</CardTitle>
          <CardDescription>
            {success
              ? "Passwort wurde erfolgreich geändert."
              : "Wählen Sie ein neues Passwort."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Sie können sich jetzt mit Ihrem neuen Passwort anmelden.
              </p>
              <Button
                className="w-full"
                onClick={() => { window.location.href = "/login"; }}
              >
                Zum Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="new-password">Neues Passwort</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Speichern..." : "Passwort ändern"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
