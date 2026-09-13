// Acceso a Google Sheets y Google Drive con la cuenta de servicio de INSUBLIMEX.
// La cuenta de servicio es un "usuario robot" del proyecto de Google Cloud de
// Insublimexoperaciones@gmail.com: escribe en la hoja y sube comprobantes sin
// que nadie tenga que iniciar sesión en un navegador.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];

export interface GoogleConfig {
  spreadsheetId: string;
  sheetName: string;
  driveFolderId: string;
}

let serviceAccount: { client_email: string; private_key: string } | null = null;
let cachedToken: { value: string; expiresAt: number } | null = null;
let configured = false;

function loadServiceAccount(): { client_email: string; private_key: string } | null {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const file = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || path.join(process.cwd(), 'service-account.json');
  try {
    const raw = inline
      ? Buffer.from(inline, inline.trim().startsWith('{') ? 'utf8' : 'base64').toString('utf8')
      : fs.readFileSync(file, 'utf8');
    const json = JSON.parse(raw);
    if (!json.client_email || !json.private_key) return null;
    return json;
  } catch {
    return null;
  }
}

export function getGoogleConfig(): GoogleConfig | null {
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) return null;
  return {
    spreadsheetId,
    sheetName: process.env.SHEETS_TAB_NAME || 'Ventas',
    driveFolderId: process.env.DRIVE_FOLDER_ID || '',
  };
}

export function isGoogleConfigured(): boolean {
  return configured;
}

export function initGoogle(): { ok: boolean; email?: string; reason?: string } {
  const sa = loadServiceAccount();
  if (!sa) {
    configured = false;
    return { ok: false, reason: 'No se encontró service-account.json ni GOOGLE_SERVICE_ACCOUNT_JSON.' };
  }
  if (!getGoogleConfig()) {
    configured = false;
    return { ok: false, reason: 'Falta SHEETS_SPREADSHEET_ID en las variables de entorno.' };
  }
  serviceAccount = sa;
  cachedToken = null;
  configured = true;
  return { ok: true, email: sa.client_email };
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/**
 * Intercambia un JWT firmado con la clave de la cuenta de servicio por un
 * access token de Google (RFC 7523). Hecho con crypto nativo y fetch nativo:
 * google-auth-library arrastra un node-fetch viejo que falla en Node 24.
 */
async function getAccessToken(): Promise<string> {
  if (!serviceAccount) throw new Error('Google no está configurado.');
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) return cachedToken.value;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: SCOPES.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), serviceAccount.private_key);
  const assertion = `${header}.${claims}.${b64url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`No se pudo obtener token de Google: ${data.error_description || data.error || res.status}`);
  }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

async function authHeaders(): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${await getAccessToken()}` };
}

async function googleFetch(url: string, init: RequestInit = {}): Promise<any> {
  const headers = { ...(await authHeaders()), ...(init.headers as Record<string, string> | undefined) };
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message || `${res.status} ${res.statusText}`;
    throw new Error(`Google API: ${msg}`);
  }
  return res.json();
}

// ───────────────────────── Sheets ─────────────────────────

export async function readRows(cfg: GoogleConfig, range = 'A1:Z5000'): Promise<string[][]> {
  const r = encodeURIComponent(`${cfg.sheetName}!${range}`);
  const data = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}/values/${r}`);
  return data.values || [];
}

export async function appendRow(cfg: GoogleConfig, values: (string | number)[]): Promise<void> {
  const r = encodeURIComponent(`${cfg.sheetName}!A1`);
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}/values/${r}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [values] }),
    }
  );
}

/** Escribe un valor en una celda concreta (fila 1-based, columna 0-based). */
export async function updateCell(cfg: GoogleConfig, rowNumber: number, colIndex: number, value: string | number): Promise<void> {
  const colLetter = String.fromCharCode(65 + colIndex);
  const r = encodeURIComponent(`${cfg.sheetName}!${colLetter}${rowNumber}`);
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}/values/${r}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[value]] }),
    }
  );
}

/** Crea la pestaña si no existe, pone encabezados y formato. Idempotente. */
export async function ensureSheetHeaders(cfg: GoogleConfig, headers: string[]): Promise<void> {
  const meta = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}?fields=sheets.properties(sheetId,title)`
  );
  let sheet = meta.sheets?.find((s: any) => s.properties.title === cfg.sheetName);
  if (!sheet) {
    const created = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: cfg.sheetName, gridProperties: { frozenRowCount: 1 } } } }],
      }),
    });
    sheet = { properties: created.replies[0].addSheet.properties };
  }
  const sheetId = sheet.properties.sheetId;

  const existing = await readRows(cfg, 'A1:Z1');
  const current = existing[0] || [];
  const same = headers.length === current.length && headers.every((h, i) => h === current[i]);
  if (same) return;

  const r = encodeURIComponent(`${cfg.sheetName}!A1`);
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}/values/${r}?valueInputOption=RAW`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [headers] }) }
  );
  await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.427, green: 0.157, blue: 0.851 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10 },
                horizontalAlignment: 'CENTER',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
          },
        },
        { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
        { autoResizeDimensions: { dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: headers.length } } },
      ],
    }),
  });
}

// ───────────────────────── Drive ─────────────────────────

export async function uploadToDrive(cfg: GoogleConfig, buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const metadata: Record<string, unknown> = { name: fileName };
  if (cfg.driveFolderId) metadata.parents = [cfg.driveFolderId];

  const boundary = `insublimex-${Date.now()}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([head, buffer, tail]);

  const data = await googleFetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true',
    { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body }
  );
  return data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`;
}

/** Comprueba que la cuenta de servicio puede ver la hoja y la carpeta. */
export async function checkAccess(cfg: GoogleConfig): Promise<{ sheetTitle: string; folderName: string }> {
  const sheet = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}?fields=properties.title`);
  let folderName = '(sin carpeta: los comprobantes irán a la raíz del Drive de la cuenta de servicio)';
  if (cfg.driveFolderId) {
    const folder = await googleFetch(`https://www.googleapis.com/drive/v3/files/${cfg.driveFolderId}?fields=name&supportsAllDrives=true`);
    folderName = folder.name;
  }
  return { sheetTitle: sheet.properties.title, folderName };
}

/** Borra filas (1-based, inclusive) de la pestaña. Se usa para limpiar pruebas. */
export async function deleteRows(cfg: GoogleConfig, fromRow: number, toRow: number): Promise<void> {
  const meta = await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}?fields=sheets.properties(sheetId,title)`);
  const sheet = meta.sheets?.find((s: any) => s.properties.title === cfg.sheetName);
  if (!sheet) return;
  await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ deleteDimension: { range: { sheetId: sheet.properties.sheetId, dimension: 'ROWS', startIndex: fromRow - 1, endIndex: toRow } } }],
    }),
  });
}
