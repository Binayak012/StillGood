import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { StillGoodLogo } from "../components/StillGoodLogo";

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
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
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <div className="auth-screen">
      <form className="panel auth-card stack" onSubmit={(event) => void submit(event)}>
        <div className="auth-head">
          <StillGoodLogo className="auth-logo" />
          <h2>Create account</h2>
          <p>Start tracking freshness in under one minute.</p>
        </div>
        <input
          required
          placeholder="Your name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
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
          minLength={8}
          placeholder="Password (8+ chars)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="button" type="submit">
          Register
        </button>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
