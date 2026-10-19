import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { Icon } from '../../components/Icon';
import { Seo } from '../../components/Seo';
import { Alert, Button, TextField } from '../../components/admin/ui';
import { useAuth } from '../../contexts/AuthContext';
import styles from './AuthPages.module.css';

function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <Seo title={`${title} · Painel do site`} noindex />
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>
            <Icon name="photo_camera" size={22} color="var(--primary)" />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>Cleides Dias</span>
            <span className={styles.brandSub}>Painel do site</span>
          </span>
        </div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
      </div>
      <Link to="/" className={styles.back}>
        <Icon name="arrow_back" size={16} />
        Voltar para o site
      </Link>
    </main>
  );
}

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (auth.status === 'signedIn') return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Informe seu e-mail e sua senha.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auth.signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Entrar no painel" subtitle="Acesso restrito à administração do site.">
      {auth.status === 'unconfigured' && <Alert>O login ainda não foi configurado neste ambiente (Supabase).</Alert>}
      {auth.status === 'forbidden' && <Alert tone="error">Esta conta não tem acesso ao painel.</Alert>}
      <form onSubmit={submit} className={styles.form} noValidate>
        <TextField label="E-mail" type="email" autoComplete="username" value={email} onChange={setEmail} required />
        <TextField label="Senha" type="password" autoComplete="current-password" value={password} onChange={setPassword} required />
        {error && <Alert tone="error" icon="error">{error}</Alert>}
        <Button type="submit" variant="primary" icon="login" loading={loading} className={styles.submit}>
          Entrar
        </Button>
      </form>
      <Link to="/admin/recuperar-senha" className={styles.link}>
        Esqueci minha senha
      </Link>
    </AuthCard>
  );
}

export function ForgotPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Informe um e-mail válido.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auth.sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Recuperar acesso" subtitle="Enviaremos um link para você criar uma nova senha.">
      {sent ? (
        <Alert icon="mark_email_read">
          Se este e-mail estiver cadastrado, você receberá um link em instantes. Confira também a caixa de spam.
        </Alert>
      ) : (
        <form onSubmit={submit} className={styles.form} noValidate>
          <TextField label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} />
          {error && <Alert tone="error" icon="error">{error}</Alert>}
          <Button type="submit" variant="primary" icon="send" loading={loading} className={styles.submit}>
            Enviar link
          </Button>
        </form>
      )}
      <Link to="/admin/entrar" className={styles.link}>
        Voltar para o login
      </Link>
    </AuthCard>
  );
}

export function ResetPasswordPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const ready = auth.recovering || auth.status === 'signedIn' || auth.status === 'forbidden';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setError('A senha deve ter pelo menos 10 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setLoading(true);
    setError('');
    try {
      await auth.updatePassword(password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Criar nova senha" subtitle="Escolha uma senha com pelo menos 10 caracteres.">
      {!ready && auth.status !== 'loading' ? (
        <Alert>Este link é inválido ou expirou. Peça um novo link na tela de recuperação.</Alert>
      ) : (
        <form onSubmit={submit} className={styles.form} noValidate>
          <TextField label="Nova senha" type="password" autoComplete="new-password" value={password} onChange={setPassword} />
          <TextField label="Confirme a nova senha" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} />
          {error && <Alert tone="error" icon="error">{error}</Alert>}
          <Button type="submit" variant="primary" icon="check" loading={loading} className={styles.submit}>
            Salvar nova senha
          </Button>
        </form>
      )}
      <Link to="/admin/recuperar-senha" className={styles.link}>
        Pedir um novo link
      </Link>
    </AuthCard>
  );
}

export function AuthMessage({ icon, title, text, signOut }: { icon: string; title: string; text: string; signOut?: boolean }) {
  const auth = useAuth();
  return (
    <AuthCard title={title}>
      <Alert icon={icon}>{text}</Alert>
      {signOut && (
        <Button variant="outline" icon="logout" onClick={() => void auth.signOut()}>
          Entrar com outra conta
        </Button>
      )}
    </AuthCard>
  );
}
