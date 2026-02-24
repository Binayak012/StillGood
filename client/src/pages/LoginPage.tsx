import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { StillGoodLogo } from "../components/StillGoodLogo";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="auth-screen">
      <form className="panel auth-card stack" onSubmit={(event) => void submit(event)}>
        <div className="auth-head">
          <StillGoodLogo className="auth-logo" />
          <h2>Welcome back</h2>
          <p>Track freshness and prevent avoidable waste.</p>
        </div>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="button" type="submit">
          Login
        </button>
        <p>
          No account? <Link to="/register">Create one</Link>
        </p>
      </form>
    </div>
  );
}
