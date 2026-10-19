/**
 * Cria (ou promove) a conta de administradora do painel.
 * Não existe cadastro público: este script é a única forma de criar acesso.
 *
 * Uso: npm run create-admin -- email@exemplo.com "Nome Completo"
 * A senha é pedida no terminal (não fica no histórico do shell).
 */
import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from '../src/config/env.js';

const [email, fullName = ''] = process.argv.slice(2);
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Uso: npm run create-admin -- email@exemplo.com "Nome Completo"');
  process.exit(1);
}

const env = loadEnv();
const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function findUserId(target: string): Promise<string | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (user) return user.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

let userId = await findUserId(email);
if (!userId) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question('Senha da nova conta (mín. 10 caracteres): ');
  rl.close();
  if (password.length < 10) {
    console.error('A senha deve ter pelo menos 10 caracteres.');
    process.exit(1);
  }
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  console.log('Conta criada no Supabase Auth.');
} else {
  console.log('Conta já existia no Supabase Auth; concedendo acesso ao painel.');
}

const { error } = await supabase.from('profiles').upsert({ id: userId, email, full_name: fullName, role: 'admin' });
if (error) throw error;
console.log(`Pronto! ${email} agora é administradora do painel.`);
