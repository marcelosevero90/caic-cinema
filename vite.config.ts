import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { defineConfig, type Plugin } from 'vite'
import nodemailer from 'nodemailer'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const GMAIL_USER = process.env.GMAIL_USER || 'caic.cinema.app@gmail.com'
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD || Buffer.from('Z2huanRhbGlwa2R4a3p3dQ==', 'base64').toString('utf-8')

function getGmailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })
}

function emailAuthPlugin(): Plugin {
  return {
    name: 'email-auth-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method === 'POST' && req.url === '/api/auth/send-verification') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const { email, name, code } = JSON.parse(body || '{}')
              if (!email || !code) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, message: 'E-mail e código são obrigatórios.' }))
                return
              }

              const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Código de Confirmação CAIC</title>
</head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #020617;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background: linear-gradient(135deg, #0891b2 0%, #4f46e5 100%); padding: 36px 32px; text-align: center;">
              <div style="font-size: 38px; margin-bottom: 8px;">🎬✨</div>
              <h1 style="color: #ffffff; font-size: 26px; margin: 0; font-weight: 900;">CAIC - Cinema &amp; IA</h1>
              <p style="color: #cffafe; font-size: 13px; margin: 6px 0 0 0;">Streaming Inteligente Multiplataforma</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="color: #0f172a; font-size: 19px; margin: 0 0 12px 0;">Olá, ${name || 'seja bem-vindo(a)'}! 👋</h2>
              <p style="color: #475569; font-size: 14px; line-height: 22px; margin: 0 0 24px 0;">
                Para confirmar seu cadastro e liberar seus <strong>7 Dias Grátis</strong>, utilize o código de validação de 6 dígitos abaixo:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #ecfeff; border: 2px dashed #06b6d4; border-radius: 16px; padding: 24px 16px;">
                    <div style="color: #0891b2; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; margin-bottom: 8px;">Seu Código de Confirmação</div>
                    <div style="color: #0e7490; font-size: 36px; font-weight: 900; letter-spacing: 8px; font-family: monospace;">${code}</div>
                    <div style="color: #64748b; font-size: 11px; margin-top: 8px;">Válido por 30 minutos</div>
                  </td>
                </tr>
              </table>
              <p style="color: #64748b; font-size: 13px;">Digite esse código no aplicativo para liberar os filmes e a IA.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2026 CAIC - Cinema &amp; IA. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

              const transporter = getGmailTransporter()
              const info = await transporter.sendMail({
                from: `"CAIC - Cinema & IA" <${GMAIL_USER}>`,
                to: email.trim().toLowerCase(),
                subject: `Código de Confirmação CAIC: ${code}`,
                html,
              })

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                success: true,
                delivered: true,
                messageId: info.messageId,
                message: 'Código de confirmação enviado para seu e-mail!'
              }))
            } catch (err: any) {
              console.error('[Gmail Dev Error - Verification]', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }

        if (req.method === 'POST' && req.url === '/api/auth/reset-password') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const { email, name, code } = JSON.parse(body || '{}')
              if (!email || !code) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, message: 'E-mail e código são obrigatórios.' }))
                return
              }

              const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Recuperação de Senha - CAIC</title>
</head>
<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #020617;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); padding: 36px 32px; text-align: center;">
              <div style="font-size: 38px; margin-bottom: 8px;">🔑✨</div>
              <h1 style="color: #ffffff; font-size: 26px; margin: 0; font-weight: 900;">CAIC - Cinema &amp; IA</h1>
              <p style="color: #e0f2fe; font-size: 13px; margin: 6px 0 0 0;">Recuperação de Senha</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="color: #0f172a; font-size: 19px; margin: 0 0 12px 0;">Olá, ${name || 'Cinéfilo'}! 👋</h2>
              <p style="color: #475569; font-size: 14px; line-height: 22px; margin: 0 0 24px 0;">
                Recebemos um pedido para redefinir a sua senha no <strong>CAIC</strong>. Para criar sua nova senha, utilize o código de 6 dígitos abaixo:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #f0f9ff; border: 2px dashed #0284c7; border-radius: 16px; padding: 24px 16px;">
                    <div style="color: #0284c7; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; margin-bottom: 8px;">Código de Recuperação</div>
                    <div style="color: #0369a1; font-size: 36px; font-weight: 900; letter-spacing: 8px; font-family: monospace;">${code}</div>
                    <div style="color: #64748b; font-size: 11px; margin-top: 8px;">Válido por 15 minutos</div>
                  </td>
                </tr>
              </table>
              <p style="color: #64748b; font-size: 13px;">Digite esse código no aplicativo para cadastrar sua nova senha.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2026 CAIC - Cinema &amp; IA. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

              const transporter = getGmailTransporter()
              const info = await transporter.sendMail({
                from: `"CAIC - Cinema & IA" <${GMAIL_USER}>`,
                to: email.trim().toLowerCase(),
                subject: `Código de Recuperação de Senha CAIC: ${code}`,
                html,
              })

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                success: true,
                delivered: true,
                messageId: info.messageId,
                message: 'Código de recuperação enviado para seu e-mail!'
              }))
            } catch (err: any) {
              console.error('[Gmail Dev Error - Reset Password]', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }
        next()
      })
    }
  }
}

// Plugin de Concorrência de Telas (1 Acesso por Vez Multiplataforma: TV Box, Celular, Web)
interface PlaybackSessionRecord {
  sessionId: string;
  accountId: string;
  profileId?: string;
  email: string;
  userName?: string;
  movieTitle: string;
  movieId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tv' | 'desktop';
  startedAt: string;
  lastHeartbeat: number;
}

const activePlaybackSessions = new Map<string, PlaybackSessionRecord>();

function playbackSessionPlugin(): Plugin {
  return {
    name: 'playback-session-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/playback/')) {
          return next();
        }

        const parseBody = (): Promise<any> =>
          new Promise((resolve) => {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); }
            });
          });

        const sendJson = (data: any, status = 200) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };

        if (req.method === 'POST' && req.url === '/api/playback/start') {
          const body = await parseBody();
          const { accountId, email, sessionId } = body;
          const key = (email || accountId || '').toLowerCase().trim();

          if (!key || !sessionId) {
            return sendJson({ allowed: false, message: 'Conta e Sessão são obrigatórias.' }, 400);
          }

          const existing = activePlaybackSessions.get(key);
          const now = Date.now();
          if (existing && existing.sessionId !== sessionId && (now - existing.lastHeartbeat < 14000)) {
            return sendJson({
              allowed: false,
              concurrentBlocked: true,
              activeSession: existing,
              message: `Limite de 1 acesso simultâneo atingido. O dispositivo "${existing.deviceName}" já está assistindo ao filme "${existing.movieTitle}".`
            });
          }

          const record: PlaybackSessionRecord = {
            ...body,
            lastHeartbeat: now,
            startedAt: existing && existing.sessionId === sessionId ? existing.startedAt : new Date().toISOString()
          };
          activePlaybackSessions.set(key, record);
          return sendJson({ allowed: true, sessionId });
        }

        if (req.method === 'POST' && req.url === '/api/playback/heartbeat') {
          const body = await parseBody();
          const { accountId, email, sessionId } = body;
          const key = (email || accountId || '').toLowerCase().trim();
          const existing = activePlaybackSessions.get(key);
          const now = Date.now();

          if (existing) {
            if (existing.sessionId === sessionId) {
              existing.lastHeartbeat = now;
              return sendJson({ allowed: true });
            } else if (now - existing.lastHeartbeat < 14000) {
              return sendJson({
                allowed: false,
                reason: 'taken_over',
                activeSession: existing,
                message: `Reprodução transferida para "${existing.deviceName}".`
              });
            }
          }

          const record: PlaybackSessionRecord = {
            ...body,
            lastHeartbeat: now,
            startedAt: new Date().toISOString()
          };
          activePlaybackSessions.set(key, record);
          return sendJson({ allowed: true });
        }

        if (req.method === 'POST' && req.url === '/api/playback/stop') {
          const body = await parseBody();
          const { accountId, email, sessionId } = body;
          const key = (email || accountId || '').toLowerCase().trim();
          const existing = activePlaybackSessions.get(key);
          if (existing && existing.sessionId === sessionId) {
            activePlaybackSessions.delete(key);
          }
          return sendJson({ success: true });
        }

        if (req.method === 'POST' && req.url === '/api/playback/takeover') {
          const body = await parseBody();
          const { accountId, email, sessionId } = body;
          const key = (email || accountId || '').toLowerCase().trim();
          const now = Date.now();
          const record: PlaybackSessionRecord = {
            ...body,
            lastHeartbeat: now,
            startedAt: new Date().toISOString()
          };
          activePlaybackSessions.set(key, record);
          return sendJson({ allowed: true, sessionId });
        }

        next();
      });
    }
  };
}

import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.resolve(import.meta.dirname, 'data/caic_db.json');

function readSharedDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
    }
  } catch (err) {
    console.warn('Erro ao ler DB:', err)
  }
  return { customMovies: [], accounts: [], requests: [], geminiKey: '', jellyfinConfig: {} }
}

function writeSharedDb(data: any) {
  try {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.warn('Erro ao escrever DB:', err)
    return false
  }
}

function sharedDatabasePlugin(): Plugin {
  return {
    name: 'shared-database-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const sendJson = (data: any, status = 200) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
        }

        const parseBody = (): Promise<any> => {
          return new Promise((resolve) => {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try { resolve(JSON.parse(body || '{}')) }
              catch { resolve({}) }
            })
          })
        }

        if (req.method === 'GET' && req.url === '/api/admin/db') {
          return sendJson(readSharedDb())
        }

        if (req.method === 'POST' && req.url === '/api/admin/db') {
          const body = await parseBody()
          const current = readSharedDb()
          const merged = { ...current, ...body }
          writeSharedDb(merged)
          return sendJson({ success: true, data: merged })
        }

        if (req.method === 'GET' && req.url === '/api/jellyfin/movies') {
          try {
            const db = readSharedDb();
            const config = db.jellyfinConfig || {};
            if (config.enabled === false) {
              return sendJson({ movies: [], count: 0 });
            }
            const serverUrl = (config.serverUrl || 'https://filme.manerostream.com.br').trim().replace(/\/+$/, '');
            const apiKey = (config.apiKey || '523e1d075fc0450caa0d7c1e862df424').trim();
            const userId = (config.userId || '6f398b88cffa4147b029cfffed37b390').trim();
            const targetTotal = Math.min(config.maxMovies > 0 ? config.maxMovies : 240, 240);
            const chunkSize = 80;
            const pages = Math.ceil(targetTotal / chunkSize);

            const headers: Record<string, string> = {
              'Accept': 'application/json',
              'X-Emby-Token': apiKey,
              'Authorization': `MediaBrowser Client="CineAI", Device="Server", DeviceId="CAIC-Backend", Version="1.0.0", Token="${apiKey}"`
            };

            const pagePromises = Array.from({ length: pages }).map(async (_, pageIdx) => {
              const startIdx = pageIdx * chunkSize;
              const curLimit = Math.min(chunkSize, targetTotal - startIdx);
              const itemsUrl = `${serverUrl}/Users/${userId}/Items?IncludeItemTypes=Movie&Recursive=true&Fields=Overview,Genres,People,MediaSources,RunTimeTicks,ProductionYear,CommunityRating,Taglines,OriginalTitle,ImageTags,BackdropImageTags&SortBy=DateCreated&SortOrder=Descending&StartIndex=${startIdx}&Limit=${curLimit}&api_key=${apiKey}`;
              try {
                let fetchRes = await fetch(itemsUrl, { headers });
                if (!fetchRes.ok && userId) {
                  const pubUrl = `${serverUrl}/Items?IncludeItemTypes=Movie&Recursive=true&Fields=Overview,Genres,People,MediaSources,RunTimeTicks,ProductionYear,CommunityRating,Taglines,OriginalTitle,ImageTags,BackdropImageTags&SortBy=DateCreated&SortOrder=Descending&StartIndex=${startIdx}&Limit=${curLimit}&api_key=${apiKey}`;
                  fetchRes = await fetch(pubUrl, { headers });
                }
                if (fetchRes.ok) {
                  const data: any = await fetchRes.json();
                  return data.Items || [];
                }
              } catch (e) {
                console.warn('Erro ao buscar página Jellyfin:', e);
              }
              return [];
            });

            const pageResults = await Promise.all(pagePromises);
            const items = pageResults.flat();
            if (items.length === 0) {
              return sendJson({ movies: [], error: 'Nenhum filme retornado pelo servidor Jellyfin.' });
            }

            const movies = items.map((item: any) => {
              const runTimeMinutes = item.RunTimeTicks
                ? Math.max(1, Math.round(item.RunTimeTicks / 600000000))
                : 90;

              const actors = (item.People || [])
                .filter((p: any) => p.Type === 'Actor')
                .slice(0, 6)
                .map((p: any) => p.Name);

              const genresList = (item.Genres && item.Genres.length > 0)
                ? item.Genres
                : ['Cinema'];

              const hasPrimary = Boolean(item.ImageTags?.Primary);
              const hasBackdrop = Boolean(item.BackdropImageTags && item.BackdropImageTags.length > 0);
              const defaultPlaceholder = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';

              const rawPosterUrl = hasPrimary
                ? `${serverUrl}/Items/${item.Id}/Images/Primary?fillWidth=400&quality=90&api_key=${apiKey}`
                : defaultPlaceholder;

              const rawBackdropUrl = hasBackdrop
                ? `${serverUrl}/Items/${item.Id}/Images/Backdrop?fillWidth=1280&quality=80&api_key=${apiKey}`
                : rawPosterUrl;

              const rawStreamUrl = `${serverUrl}/Videos/${item.Id}/stream?static=true&api_key=${apiKey}`;

              const posterUrl = hasPrimary
                ? `/api/jellyfin/proxy?url=${encodeURIComponent(rawPosterUrl)}`
                : defaultPlaceholder;

              const backdropUrl = hasBackdrop
                ? `/api/jellyfin/proxy?url=${encodeURIComponent(rawBackdropUrl)}`
                : posterUrl;

              const streamUrl = `/api/jellyfin/proxy?url=${encodeURIComponent(rawStreamUrl)}`;

              return {
                id: `jellyfin_${item.Id}`,
                title: item.Name || 'Filme sem título',
                originalTitle: item.OriginalTitle || undefined,
                synopsis: item.Overview || 'Filme do acervo remoto Jellyfin.',
                genres: genresList,
                cast: actors,
                tags: item.Taglines && item.Taglines.length > 0 ? item.Taglines : ['acervo remoto', 'jellyfin'],
                moods: ['cinema em casa'],
                releaseYear: item.ProductionYear || new Date().getFullYear(),
                durationMinutes: runTimeMinutes,
                posterUrl,
                backdropUrl,
                channelName: 'Servidor Jellyfin',
                contentRating: item.OfficialRating || '14',
                language: 'Dublado',
                ratingScore: item.CommunityRating ? Math.round(item.CommunityRating * 10) / 10 : 8.5,
                badge: 'Jellyfin Stream',
                source: 'jellyfin',
                jellyfinItemId: item.Id,
                streamUrl,
                youtubeVideoId: '',
                featured: false
              };
            });

            return sendJson({ movies, total: movies.length });
          } catch (err: any) {
            return sendJson({ movies: [], error: err.message }, 500);
          }
        }

        if (req.url?.startsWith('/api/jellyfin/proxy')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            const targetUrl = urlObj.searchParams.get('url');
            if (!targetUrl) {
              return sendJson({ error: 'Parâmetro url é obrigatório' }, 400);
            }
            const authHeader = (req.headers['authorization'] as string) || '';
            const embyToken = (req.headers['x-emby-token'] as string) || '';
            const range = req.headers['range'];

            const forwardHeaders: Record<string, string> = {
              Accept: '*/*',
            };
            if (authHeader) forwardHeaders['Authorization'] = authHeader;
            if (embyToken) forwardHeaders['X-Emby-Token'] = embyToken;
            if (range) forwardHeaders['Range'] = range;

            const fetchRes = await fetch(targetUrl, {
              method: req.method || 'GET',
              headers: forwardHeaders,
            });

            res.statusCode = fetchRes.status;
            for (const [key, val] of fetchRes.headers.entries()) {
              if (['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'].includes(key.toLowerCase())) {
                res.setHeader(key, val);
              }
            }

            if (fetchRes.body) {
              const { Readable } = await import('stream');
              Readable.fromWeb(fetchRes.body as any).pipe(res);
            } else {
              res.end();
            }
            return;
          } catch (proxyErr: any) {
            return sendJson({ error: proxyErr.message || 'Erro ao conectar ao Jellyfin via proxy' }, 502);
          }
        }

        next()
      })
    }
  }
}

function mercadoPagoDevPlugin(): Plugin {
  return {
    name: 'mercadopago-dev-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/payments/') && !req.url?.startsWith('/api/webhooks/mercadopago')) {
          return next();
        }

        const parseBody = (): Promise<any> =>
          new Promise((resolve) => {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); }
            });
          });

        const sendJson = (data: any, status = 200) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.end(JSON.stringify(data));
        };

        if (req.method === 'OPTIONS') {
          return sendJson({}, 200);
        }

        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.VITE_MERCADO_PAGO_ACCESS_TOKEN || '';

        // 1. POST /api/payments/create-pix
        if (req.method === 'POST' && req.url?.startsWith('/api/payments/create-pix')) {
          try {
            const body = await parseBody();
            const { amount, description, email, name, planType, billingCycle } = body;

            if (!amount || !email) {
              return sendJson({ success: false, message: 'Valor (amount) e e-mail são obrigatórios.' }, 400);
            }

            const nameParts = (name || 'Assinante CAIC').trim().split(' ');
            const firstName = nameParts[0] || 'Assinante';
            const lastName = nameParts.slice(1).join(' ') || 'CAIC';
            const idempotencyKey = `caic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            const mpPayload = {
              transaction_amount: Number(amount),
              description: description || `Assinatura CAIC Cinema (${planType || 'Plano'} - ${billingCycle || 'mensal'})`,
              payment_method_id: 'pix',
              payer: {
                email: email.trim().toLowerCase(),
                first_name: firstName,
                last_name: lastName,
              },
            };

            const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': idempotencyKey,
              },
              body: JSON.stringify(mpPayload),
            });

            const mpData: any = await mpResponse.json();

            if (!mpResponse.ok) {
              console.error('[Mercado Pago Dev Pix Error]', mpData);
              let userFriendlyMessage = mpData.message || 'Erro ao gerar cobrança Pix no Mercado Pago.';
              if (mpData.message?.includes('Collector user without key enabled for QR render')) {
                userFriendlyMessage = 'Sua conta do Mercado Pago precisa ter pelo menos 1 Chave Pix cadastrada para emitir cobranças. Abra o app do Mercado Pago e cadastre uma Chave Aleatória ou CPF no menu Pix.';
              }
              return sendJson({
                success: false,
                message: userFriendlyMessage,
                details: mpData,
              }, mpResponse.status || 400);
            }

            const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code;
            const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
            const ticketUrl = mpData.point_of_interaction?.transaction_data?.ticket_url;
            const expirationDate = mpData.date_of_expiration;

            return sendJson({
              success: true,
              paymentId: mpData.id,
              status: mpData.status,
              statusDetail: mpData.status_detail,
              amount: mpData.transaction_amount,
              qrCode,
              qrCodeBase64,
              ticketUrl,
              expirationDate,
            });
          } catch (err: any) {
            console.error('[Mercado Pago Dev Pix Exception]', err);
            return sendJson({ success: false, message: err?.message || 'Erro interno ao processar Pix.' }, 500);
          }
        }

        // 2. GET /api/payments/status
        if (req.method === 'GET' && req.url?.startsWith('/api/payments/status')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            const paymentId = urlObj.searchParams.get('paymentId');
            if (!paymentId) {
              return sendJson({ success: false, message: 'paymentId é obrigatório.' }, 400);
            }

            const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });

            const data: any = await mpRes.json();
            if (!mpRes.ok) {
              return sendJson({ success: false, message: data.message || 'Erro ao consultar pagamento.', details: data }, mpRes.status);
            }

            return sendJson({
              success: true,
              paymentId: data.id,
              status: data.status,
              statusDetail: data.status_detail,
              isApproved: data.status === 'approved',
              amount: data.transaction_amount,
              payerEmail: data.payer?.email,
              dateApproved: data.date_approved,
            });
          } catch (err: any) {
            return sendJson({ success: false, message: err?.message || 'Erro ao consultar status.' }, 500);
          }
        }

        // 3. GET /api/payments/verify-subscription
        if (req.method === 'GET' && req.url?.startsWith('/api/payments/verify-subscription')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            const emailParam = (urlObj.searchParams.get('email') || '').trim().toLowerCase();
            const paymentIdParam = (urlObj.searchParams.get('paymentId') || '').trim();

            const mpRes = await fetch('https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=30', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });

            const data: any = await mpRes.json();
            const results: any[] = Array.isArray(data.results) ? data.results : [];
            const now = Date.now();

            const approvedPayments = results.filter((p: any) => {
              if (p.status !== 'approved') return false;
              const desc = (p.description || '').toLowerCase();
              return desc.includes('caic cinema') || desc.includes('caic');
            });

            let matchedPayment = paymentIdParam ? approvedPayments.find((p) => String(p.id) === String(paymentIdParam)) : null;

            if (!matchedPayment && emailParam) {
              matchedPayment = approvedPayments.find((p) => {
                const payerEmail = (p.payer?.email || '').toLowerCase();
                const extRef = (p.external_reference || '').toLowerCase();
                return payerEmail === emailParam || extRef.includes(emailParam);
              });
            }

            if (!matchedPayment && approvedPayments.length > 0) {
              matchedPayment = approvedPayments[0];
            }

            if (matchedPayment) {
              const isAnnual = (matchedPayment.description || '').toLowerCase().includes('anual') || matchedPayment.transaction_amount >= 19.0;
              const durationDays = isAnnual ? 365 : 30;
              const approvedDate = matchedPayment.date_approved ? new Date(matchedPayment.date_approved).getTime() : now;
              const expiresAtMs = approvedDate + durationDays * 86400000;
              const isActive = expiresAtMs > now;

              const isFamily = (matchedPayment.description || '').toLowerCase().includes('família') || (matchedPayment.description || '').toLowerCase().includes('familia');
              const planName = isFamily
                ? (isAnnual ? 'Plano Família Anual (R$ 29,90/ano)' : 'Plano Família Mensal (R$ 9,90/mês)')
                : (isAnnual ? 'Plano Individual Anual (R$ 19,90/ano)' : 'Plano Individual Mensal (R$ 5,90/mês)');

              return sendJson({
                success: true,
                hasActiveSubscription: isActive,
                paymentId: matchedPayment.id,
                status: matchedPayment.status,
                amount: matchedPayment.transaction_amount,
                plan: planName,
                subscriptionPlan: isFamily ? 'family' : 'individual',
                billingCycle: isAnnual ? 'annual' : 'monthly',
                dateApproved: matchedPayment.date_approved,
                expiresAt: new Date(expiresAtMs).toISOString(),
                payerEmail: matchedPayment.payer?.email,
                description: matchedPayment.description,
              });
            }

            return sendJson({ success: true, hasActiveSubscription: false });
          } catch (err: any) {
            return sendJson({ success: false, message: err?.message }, 500);
          }
        }

        // 4. Webhook: GET / POST /api/webhooks/mercadopago
        if (req.url?.startsWith('/api/webhooks/mercadopago')) {
          return sendJson({ received: true });
        }

        next();
      });
    },
  };
}

function deepseekDevPlugin(): Plugin {
  return {
    name: 'deepseek-dev-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method === 'POST' && req.url === '/api/ai/deepseek') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const apiKey = process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY || '';
              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY não configurada no ambiente.' }));
                return;
              }
              const dsResponse = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: payload.model || 'deepseek-chat',
                  messages: payload.messages || [],
                  temperature: payload.temperature ?? 0.7,
                  max_tokens: payload.max_tokens ?? 1800,
                  response_format: payload.response_format,
                }),
              });
              const data = await dsResponse.json();
              res.statusCode = dsResponse.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Erro no proxy DeepSeek' }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['chrome >= 49', 'android >= 7', 'defaults', 'not IE 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
    emailAuthPlugin(),
    playbackSessionPlugin(),
    sharedDatabasePlugin(),
    mercadoPagoDevPlugin(),
    deepseekDevPlugin()
  ],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    watch: {
      ignored: ['**/data/**', '**/caic_db.json', '**/data/*'],
    },
  },
})

