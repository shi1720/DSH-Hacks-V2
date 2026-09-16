import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { initializeApp, type FirebaseOptions } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type User,
} from "firebase/auth";
import Lotlight from "../app/lotlight";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import "../app/globals.css";
let config: FirebaseOptions & { apiBase: string };
let auth: ReturnType<typeof getAuth>;
function App() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [open, setOpen] = useState(false),
    [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setReady(true);
      }),
    [],
  );
  const request = useCallback(async (input: string, init?: RequestInit) => {
    const current = auth.currentUser;
    if (!current)
      return Response.json(
        { error: "Your session ended. Sign in again." },
        { status: 401 },
      );
    const token = await current.getIdToken();
    return fetch(config.apiBase + input, {
      ...init,
      headers: { ...init?.headers, Authorization: "Bearer " + token },
      credentials: "omit",
    });
  }, []);
  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email);
        setMessage(
          "If an account exists for this email, password reset instructions will arrive shortly.",
        );
      } else {
        if (mode === "signup")
          await createUserWithEmailAndPassword(auth, email, password);
        else await signInWithEmailAndPassword(auth, email, password);
        setOpen(false);
        setPassword("");
      }
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(
        code === "auth/weak-password"
          ? "Use at least 12 characters for your password."
          : code === "auth/email-already-in-use"
            ? "An account already uses this email. Sign in or reset your password."
            : code === "auth/network-request-failed"
              ? "Connection failed. Please retry."
              : code === "auth/too-many-requests"
                ? "Too many attempts. Wait a moment and try again."
                : "Sign-in failed. Check your email and password, or create an account.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <div className="loading-state">
        <h1>Opening Lotlight</h1>
        <p>Checking your saved session.</p>
      </div>
    );
  return (
    <>
      <Lotlight
        key={user?.uid ?? "demo"}
        user={
          user
            ? {
                name:
                  user.displayName ||
                  user.email?.split("@")[0] ||
                  "Clinic reviewer",
                email: user.email || "",
              }
            : null
        }
        request={request}
        onAuth={() => {
          if (user) {
            void signOut(auth);
          } else {
            setOpen(true);
            setError("");
            setMessage("");
          }
        }}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="auth-dialog">
          <DialogHeader>
            <DialogTitle>
              {mode === "signup"
                ? "Create your workspace"
                : mode === "reset"
                  ? "Reset your password"
                  : "Welcome back"}
            </DialogTitle>
            <DialogDescription>
              Save inventory, source reviews and response history in your
              private account. The current unsaved demo does not transfer when
              you sign in. Do not enter patient data.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={authenticate} className="auth-form">
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {mode !== "reset" && (
              <label>
                Password
                <input
                  type="password"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  minLength={mode === "signup" ? 12 : undefined}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}
            {mode === "signup" && (
              <p className="field-help">
                Use 12 or more characters. Your account is private to you.
              </p>
            )}
            {error && (
              <p role="alert" className="auth-error">
                {error}
              </p>
            )}
            {message && <p role="status">{message}</p>}
            <button className="btn-primary" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : mode === "reset"
                    ? "Send reset instructions"
                    : "Sign in"}
            </button>
          </form>
          <div className="auth-links">
            <button
              className="text-button"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError("");
                setMessage("");
              }}
            >
              {mode === "signup"
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </button>
            <button
              className="text-button"
              onClick={() => {
                setMode(mode === "reset" ? "signin" : "reset");
                setError("");
                setMessage("");
              }}
            >
              {mode === "reset" ? "Back to sign in" : "Forgot password?"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
const root = createRoot(document.getElementById("root")!);
root.render(<div className="loading-state"><h1>Opening Lotlight</h1><p>Loading your workspace tools.</p></div>);
async function bootstrap() {
  try {
    const response = await fetch("/firebase-config.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Configuration unavailable");
    config = await response.json();
    if (!config.apiKey || !config.projectId || !config.apiBase?.startsWith("https://"))
      throw new Error("Invalid configuration");
    auth = getAuth(initializeApp(config));
    root.render(<App />);
  } catch {
    root.render(<div className="loading-state" role="alert"><h1>Lotlight could not load</h1><p>Check your connection and try again. Your saved workspace has not changed.</p><button className="btn-primary" onClick={() => window.location.reload()}>Retry loading</button></div>);
  }
}
void bootstrap();
