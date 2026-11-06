import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { AlertCircle, Eye, EyeOff, FileSignature, Loader2 } from "lucide-react";
import { DEMO_ACCOUNTS, login } from "../lib/auth";
import { setUser } from "../slice/userSlice";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function LoginPage() {
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = {};
    if (!email.trim()) errors.email = "Enter your email address.";
    if (!password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const { user } = await login({ email, password });
      dispatch(setUser(user));
    } catch (error) {
      setFormError(error.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary">
            <FileSignature className="size-5" />
          </span>
          <span className="text-lg font-semibold">Legal Agreement ERP</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            Every client agreement, from draft to execution.
          </h2>
          <p className="mt-4 text-slate-300">
            Create agreements, route them for approval, manage addendums, and stay ahead of contract expiry.
          </p>
        </div>
        <p className="text-sm text-slate-400">iSmart Facitech</p>
      </aside>

      <main className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileSignature className="size-5" />
            </span>
            <span className="text-lg font-semibold">Legal Agreement ERP</span>
          </div>

          <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use your work email and password.</p>

          {formError && (
            <div role="alert" className="mt-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {formError}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                className="h-10"
                placeholder="name@company.com"
                value={email}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                onChange={(event) => setEmail(event.target.value)}
              />
              {fieldErrors.email && <p id="email-error" className="text-sm text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="h-10 pr-10"
                  value={password}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldErrors.password && <p id="password-error" className="text-sm text-destructive">{fieldErrors.password}</p>}
            </div>

            <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-8 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Development accounts</p>
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.user.email}
                  type="button"
                  className="block w-full rounded px-1 py-1 text-left hover:bg-muted"
                  onClick={() => {
                    setEmail(account.user.email);
                    setPassword(account.password);
                  }}
                >
                  {account.user.role}: {account.user.email} / {account.password}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
