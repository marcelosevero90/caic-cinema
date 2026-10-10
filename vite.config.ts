import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import https from 'node:https'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || ''
const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || 'CAIC Streaming <onboarding@resend.dev>'

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
  <title>Código de Validação CAIC</title>
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

              const payload = JSON.stringify({
                from: SENDER_EMAIL,
                to: [email],
                subject: `Código de Validação CAIC: ${code}`,
                html,
              })

              const resendReq = https.request('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${RESEND_API_KEY}`,
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(payload)
                },
                rejectUnauthorized: false
              }, (resendRes) => {
                let resData = ''
                resendRes.on('data', chunk => { resData += chunk })
                resendRes.on('end', () => {
                  try {
                    const parsed = JSON.parse(resData)
                    if (resendRes.statusCode && resendRes.statusCode >= 200 && resendRes.statusCode < 300) {
                      res.setHeader('Content-Type', 'application/json')
                      res.end(JSON.stringify({ success: true, delivered: true, message: 'Código de confirmação enviado para seu e-mail!' }))
                    } else {
                      const isSandbox = (resendRes.statusCode === 403 || resendRes.statusCode === 422) &&
                        (parsed?.message || '').toLowerCase().includes('testing emails')
                      res.setHeader('Content-Type', 'application/json')
                      res.end(JSON.stringify({
                        success: true,
                        delivered: false,
                        sandboxCode: code,
                        message: isSandbox
                          ? 'Código gerado com sucesso (Modo Demonstração / Sandbox do Resend)'
                          : 'Código gerado com sucesso!',
                      }))
                    }
                  } catch {
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({ success: true, delivered: false, sandboxCode: code }))
                  }
                })
              })

              resendReq.on('error', (err) => {
                console.warn('[Resend Dev Error]', err.message)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, delivered: false, sandboxCode: code }))
              })

              resendReq.write(payload)
              resendReq.end()
            } catch (err: any) {
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), emailAuthPlugin(), playbackSessionPlugin(), sharedDatabasePlugin()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    watch: {
      ignored: ['**/data/**', '**/caic_db.json', '**/data/*'],
    },
  },
})
