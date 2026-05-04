import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FieldError, FieldHelp, Label } from "@/components/ui/Label";

export function SignupPage() {
  const { signUp, session } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signUp({ email, password, fullName });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
            <span className="text-lg font-bold">A</span>
          </div>
          <div>
            <div className="text-base font-semibold text-slate-900">
              Create your account
            </div>
            <div className="text-xs text-slate-500">
              The first user becomes admin via SQL
            </div>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName" required>
              Full name
            </Label>
            <Input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Riya Sharma"
            />
          </div>
          <div>
            <Label htmlFor="email" required>
              Work email
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@agency.com"
            />
          </div>
          <div>
            <Label htmlFor="password" required>
              Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FieldHelp>
              At least 6 characters. New accounts default to <b>Team Member</b>.
              Promote to admin via SQL:
              <code className="ml-1 rounded bg-slate-100 px-1 py-0.5 text-[11px]">
                update profiles set role='admin' where email='you@agency.com';
              </code>
            </FieldHelp>
          </div>
          <FieldError message={error ?? undefined} />
          <Button type="submit" className="w-full" loading={loading}>
            Create account
          </Button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
