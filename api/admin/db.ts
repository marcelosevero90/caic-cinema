import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  plan?: string;
  subscriptionPlan?: 'individual' | 'family' | 'free';
  billingCycle?: 'monthly' | 'annual';
  subscriptionStatus?: 'trial' | 'active' | 'expired' | 'canceled';
  trialStartDate?: string;
  trialEndDate?: string;
  paymentMethod?: string;
  lastPaymentAmount?: number;
  paymentHistory?: any[];
  createdAt?: string;
  avatar?: string;
  isAuthenticated?: boolean;
}

interface SharedDbState {
  customMovies: any[];
  accounts: UserAccount[];
  requests: any[];
  geminiKey: string;
  jellyfinConfig: Record<string, any>;
}

const SEED_ACCOUNTS: UserAccount[] = [
  {
    id: 'acc-daniel-bragion',
    name: 'Daniel Bragion',
    email: 'bragiondaniel@hotmail.com',
    plan: 'Plano Individual Mensal (R$ 5,90/mês)',
    subscriptionPlan: 'individual',
    billingCycle: 'monthly',
    subscriptionStatus: 'trial',
    trialStartDate: '2026-10-13T12:00:00.000Z',
    trialEndDate: '2026-10-20T12:00:00.000Z',
    paymentMethod: 'PIX (Mercado Pago)',
    lastPaymentAmount: 0,
    paymentHistory: [
      {
        id: 'pay-trial-daniel-bragion',
        date: '2026-10-13T12:00:00.000Z',
        amount: 0,
        plan: 'Plano Individual Mensal (R$ 5,90/mês) (7 Dias Grátis de Teste)',
        status: 'paid',
        method: 'Período de Teste',
      },
    ],
    createdAt: '2026-10-13T12:00:00.000Z',
    avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ShadowHero&backgroundColor=b6e3f4,c0aede,d1d4f9',
    isAuthenticated: true,
  },
  {
    id: 'acc-1791773795330',
    name: 'Fmstecnoinfo',
    email: 'fmstecnoinfo',
    password: '123456',
    plan: 'Plano Individual Mensal (R$ 5,90/mês)',
    subscriptionPlan: 'individual',
    billingCycle: 'monthly',
    subscriptionStatus: 'trial',
    trialStartDate: '2026-10-12T02:56:35.330Z',
    trialEndDate: '2026-10-19T02:56:35.330Z',
    paymentMethod: 'PIX (Mercado Pago)',
    lastPaymentAmount: 0,
    paymentHistory: [
      {
        id: 'pay-trial-1791773795330',
        date: '2026-10-12T02:56:35.330Z',
        amount: 0,
        plan: 'Plano Individual Mensal (R$ 5,90/mês) (7 Dias Grátis de Teste)',
        status: 'paid',
        method: 'Período de Teste',
      },
    ],
    createdAt: '2026-10-12T02:56:35.330Z',
    avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=ShadowHero&backgroundColor=b6e3f4,c0aede,d1d4f9',
    isAuthenticated: true,
  },
  {
    id: 'acc-1791580673310',
    name: 'Marcelo.antonio.severo',
    email: 'marcelo.antonio.severo@gmail.com',
    plan: 'Plano Individual Mensal (R$ 5,90/mês)',
    subscriptionPlan: 'individual',
    billingCycle: 'monthly',
    subscriptionStatus: 'trial',
    trialStartDate: '2026-10-09T21:17:53.310Z',
    trialEndDate: '2026-10-16T21:17:53.310Z',
    paymentMethod: 'Cartão de Crédito (7 Dias Grátis)',
    lastPaymentAmount: 0,
    paymentHistory: [
      {
        id: 'pay-trial-1791580673310',
        date: '2026-10-09T21:17:53.310Z',
        amount: 0,
        plan: 'Plano Individual Mensal (R$ 5,90/mês) (7 Dias Grátis de Teste)',
        status: 'paid',
        method: 'Período de Teste',
      },
    ],
    createdAt: '2026-10-09T21:17:53.310Z',
    avatar: 'https://api.dicebear.com/9.x/bottts/svg?seed=PopcornDroid&backgroundColor=ffdfbf,ffd5dc',
    isAuthenticated: true,
  },
];

const TMP_DB_PATH = path.join(os.tmpdir(), 'caic_db.json');
const PROJECT_DB_PATH = path.join(process.cwd(), 'data', 'caic_db.json');

// Memória persistente enquanto a instância serverless estiver ativa
let inMemoryDb: SharedDbState | null = null;

function mergeAccountsList(existing: UserAccount[], incoming: UserAccount[]): UserAccount[] {
  const result: UserAccount[] = [...existing];

  for (const item of incoming) {
    if (!item || !item.email) continue;
    const itemEmail = item.email.trim().toLowerCase();
    const idx = result.findIndex(
      (a) => a.id === item.id || (a.email && a.email.trim().toLowerCase() === itemEmail)
    );

    if (idx >= 0) {
      // Merge preservando dados importantes e mais recentes
      result[idx] = {
        ...result[idx],
        ...item,
        paymentHistory: [
          ...(result[idx].paymentHistory || []),
          ...(item.paymentHistory || []).filter(
            (newPay: any) => !(result[idx].paymentHistory || []).some((oldPay: any) => oldPay.id === newPay.id)
          ),
        ],
      };
    } else {
      result.push(item);
    }
  }

  return result;
}

export function getSharedDb(): SharedDbState {
  if (inMemoryDb) {
    inMemoryDb.accounts = mergeAccountsList(inMemoryDb.accounts, SEED_ACCOUNTS);
    return inMemoryDb;
  }

  let loaded: Partial<SharedDbState> = {};

  // 1. Tenta carregar do /tmp
  try {
    if (fs.existsSync(TMP_DB_PATH)) {
      const raw = fs.readFileSync(TMP_DB_PATH, 'utf-8');
      loaded = JSON.parse(raw);
    }
  } catch {}

  // 2. Se não houver no /tmp, tenta do arquivo de dados do projeto
  if (!loaded.accounts || loaded.accounts.length === 0) {
    try {
      if (fs.existsSync(PROJECT_DB_PATH)) {
        const raw = fs.readFileSync(PROJECT_DB_PATH, 'utf-8');
        loaded = JSON.parse(raw);
      }
    } catch {}
  }

  const baseAccounts = Array.isArray(loaded.accounts) ? loaded.accounts : [];
  const mergedAccounts = mergeAccountsList(baseAccounts, SEED_ACCOUNTS);

  inMemoryDb = {
    customMovies: Array.isArray(loaded.customMovies) ? loaded.customMovies : [],
    accounts: mergedAccounts,
    requests: Array.isArray(loaded.requests) ? loaded.requests : [],
    geminiKey: typeof loaded.geminiKey === 'string' ? loaded.geminiKey : '',
    jellyfinConfig: loaded.jellyfinConfig || {},
  };

  return inMemoryDb;
}

export function saveSharedDb(updates: Partial<SharedDbState>): SharedDbState {
  const current = getSharedDb();

  const newAccounts = updates.accounts
    ? mergeAccountsList(current.accounts, updates.accounts)
    : current.accounts;

  const merged: SharedDbState = {
    ...current,
    ...updates,
    accounts: newAccounts,
  };

  inMemoryDb = merged;

  // Persiste em /tmp
  try {
    fs.writeFileSync(TMP_DB_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[DB] Aviso: falha ao escrever em /tmp:', err);
  }

  // Se possível (ambiente de dev local), tenta gravar também no diretório do projeto
  try {
    if (fs.existsSync(path.dirname(PROJECT_DB_PATH))) {
      fs.writeFileSync(PROJECT_DB_PATH, JSON.stringify(merged, null, 2), 'utf-8');
    }
  } catch {}

  return merged;
}

export default async function handler(
  req: IncomingMessage & { body?: any },
  res: ServerResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    const db = getSharedDb();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(db));
    return;
  }

  if (req.method === 'POST') {
    try {
      let bodyData = req.body;
      if (!bodyData) {
        const buffers: Buffer[] = [];
        for await (const chunk of req) {
          buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const raw = Buffer.concat(buffers).toString('utf-8');
        bodyData = raw ? JSON.parse(raw) : {};
      }

      const saved = saveSharedDb(bodyData);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: true,
          accounts: saved.accounts,
          data: saved,
        })
      );
      return;
    } catch (err: any) {
      console.error('[API Admin DB] Erro no processamento de POST:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          error: err.message || 'Erro ao sincronizar banco compartilhado.',
        })
      );
      return;
    }
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ success: false, message: 'Método não permitido.' }));
}
