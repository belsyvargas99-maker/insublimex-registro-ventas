// Pipeline de una venta: validar → evaluar con el motor → subir comprobante a
// Drive → escribir la fila en la hoja. Si Google falla, la venta se guarda en
// disco (data/pending.json) y se reintenta sola cada minuto. Nada se pierde.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CustomerSaleRecord } from '../src/types';
import { evaluateSaleRecord } from '../src/services/smartEngine';
import { SHEET_COLUMNS, COL, recordToRowValues, rowToRecord } from '../src/shared/sheetColumns';
import { appendRow, readRows, updateCell, uploadToDrive, ensureSheetHeaders, getGoogleConfig, isGoogleConfigured } from './google';

// Lista de asesoras: solo desde .env (ASESORAS=Nombre Uno,Nombre Dos). Sin valor por defecto.
export const ASESORAS = (process.env.ASESORAS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const PENDING_FILE = path.join(DATA_DIR, 'pending.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
};
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const VALID_METHODS = ['Transferencia', 'Zelle', 'Efectivo'] as const;
/**
 * Dónde viven las fotos de comprobantes:
 * - 'local' (por defecto): en el disco del servidor, bajo /comprobantes/<id>-<token>.<ext>.
 *   El token aleatorio hace el enlace imposible de adivinar; el enlace va a la hoja.
 * - 'drive': sube a la carpeta de Drive. Solo funciona con Google Workspace (unidad
 *   compartida): las cuentas de servicio no pueden ser dueñas de archivos en un Gmail.
 */
const RECEIPT_STORAGE = process.env.RECEIPT_STORAGE === 'drive' ? 'drive' : 'local';
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');

export class ValidationError extends Error {}

// ───────────────────────── utilidades ─────────────────────────

export function todayInVenezuela(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function nowInVenezuela(): string {
  return new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas', dateStyle: 'short', timeStyle: 'medium' });
}

export function normalizeCedula(raw: unknown): string | null {
  const clean = String(raw ?? '').trim().toUpperCase().replace(/[\s.\-]/g, '');
  const m = clean.match(/^([VEJPG])?(\d{6,9})$/);
  if (!m) return null;
  return `${m[1] ?? 'V'}-${m[2]}`;
}

function newReceiptId(): string {
  return `INS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
}

interface SavedImage {
  localPath: string;
  publicUrl: string;
  mime: string;
  fileName: string;
}

function saveReceiptImage(dataUrl: unknown, receiptId: string): SavedImage | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:([a-z]+\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!m) throw new ValidationError('La imagen del comprobante no tiene un formato válido.');
  const mime = m[1].toLowerCase();
  const ext = ALLOWED_IMAGE_TYPES[mime];
  if (!ext) throw new ValidationError('Solo se aceptan imágenes JPG, PNG, WEBP, HEIC o PDF.');
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) throw new ValidationError('La imagen supera los 6 MB. Toma la captura de nuevo o comprímela.');
  const fileName = `${receiptId}-${crypto.randomBytes(9).toString('base64url')}.${ext}`;
  const localPath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(localPath, buffer);
  return { localPath, publicUrl: `/comprobantes/${fileName}`, mime, fileName };
}

// ───────────────────────── caché de la hoja ─────────────────────────

let cache: { records: CustomerSaleRecord[]; at: number } = { records: [], at: 0 };
const CACHE_MS = 20_000;

export async function getRecords(force = false): Promise<CustomerSaleRecord[]> {
  const cfg = getGoogleConfig();
  if (!cfg || !isGoogleConfigured()) return loadPending().map((p) => ({ ...p.record, syncedToSheets: false })).reverse();
  if (!force && Date.now() - cache.at < CACHE_MS) return cache.records;
  const rows = await readRows(cfg);
  const records: CustomerSaleRecord[] = [];
  rows.slice(1).forEach((row, i) => {
    const r = rowToRecord(row, i + 2);
    if (r) records.push(r);
  });
  // Los pendientes de escribir también cuentan para detectar duplicados
  const pendingRecords = loadPending().map((p) => ({ ...p.record, syncedToSheets: false }));
  cache = { records: [...pendingRecords, ...records.reverse()], at: Date.now() };
  return cache.records;
}

export function invalidateCache() {
  cache.at = 0;
}

// ───────────────────────── cola en disco ─────────────────────────

interface PendingItem {
  record: CustomerSaleRecord;
  image?: SavedImage;
  attempts: number;
  lastError?: string;
  queuedAt: string;
}

function loadPending(): PendingItem[] {
  try {
    return JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function savePending(items: PendingItem[]) {
  fs.writeFileSync(PENDING_FILE, JSON.stringify(items, null, 2));
}

export function pendingCount(): number {
  return loadPending().length;
}

/** Sube el comprobante (si hay) y escribe la fila. Lanza si Google falla. */
async function writeToGoogle(record: CustomerSaleRecord, image?: SavedImage): Promise<CustomerSaleRecord> {
  const cfg = getGoogleConfig();
  if (!cfg || !isGoogleConfigured()) throw new Error('Google no está configurado.');

  const final = { ...record };
  if (image && RECEIPT_STORAGE === 'drive' && !final.receiptImageUrl?.includes('drive.google.com')) {
    const buffer = fs.readFileSync(image.localPath);
    const driveName = `${record.purchaseDate} ${record.id} - ${record.customerName}.${image.fileName.split('.').pop()}`;
    final.receiptImageUrl = await uploadToDrive(cfg, buffer, driveName, image.mime);
  }
  await appendRow(cfg, recordToRowValues(final));
  final.syncedToSheets = true;
  if (image && RECEIPT_STORAGE === 'drive') {
    // Ya está en Drive: la copia local deja de ser necesaria.
    try {
      fs.unlinkSync(image.localPath);
    } catch {}
  }
  invalidateCache();
  return final;
}

/** Reintenta lo que quedó en cola. Se llama cada minuto y al arrancar. */
export async function flushPending(log: (msg: string) => void = console.log): Promise<void> {
  const items = loadPending();
  if (!items.length || !isGoogleConfigured()) return;
  const remaining: PendingItem[] = [];
  for (const item of items) {
    try {
      await writeToGoogle(item.record, item.image);
      log(`[Cola] ${item.record.id} escrito en la hoja tras ${item.attempts + 1} intento(s).`);
    } catch (err: any) {
      remaining.push({ ...item, attempts: item.attempts + 1, lastError: err.message });
      log(`[Cola] ${item.record.id} sigue pendiente: ${err.message}`);
    }
  }
  savePending(remaining);
}

// ───────────────────────── entrada de una venta ─────────────────────────

export interface SaleInput {
  customerName: unknown;
  customerEmail: unknown;
  customerPhone: unknown;
  cedula: unknown;
  asesora: unknown;
  estado: unknown;
  ciudad: unknown;
  direccion: unknown;
  productName: unknown;
  category?: unknown;
  quantity: unknown;
  unitPrice?: unknown;
  totalAmount: unknown;
  paymentMethod: unknown;
  paymentType: unknown;
  paymentReference: unknown;
  notes?: unknown;
  receiptImage?: unknown;
}

export interface SaleResult {
  record: CustomerSaleRecord;
  queued: boolean;
}

/**
 * Valida, evalúa y registra una venta. `source` indica si la llenó el cliente
 * (portal) o una asesora (panel). Devuelve el registro final; `queued` = true
 * significa que Google no respondió y quedó en cola de reintento.
 */
export async function registerSale(input: SaleInput, source: 'portal-cliente' | 'panel-asesora'): Promise<SaleResult> {
  const customerName = String(input.customerName || '').trim();
  const customerEmail = String(input.customerEmail || '').trim().toLowerCase();
  const customerPhone = String(input.customerPhone || '').trim();
  const productName = String(input.productName || '').trim();
  if (!customerName || !customerEmail || !productName) {
    throw new ValidationError('Nombre, correo electrónico y producto son obligatorios.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    throw new ValidationError('Por favor ingresa un correo electrónico válido.');
  }
  const cedula = normalizeCedula(input.cedula);
  if (!cedula) throw new ValidationError('Indica una cédula de identidad válida (ej. V-12345678).');
  const asesora = ASESORAS.includes(String(input.asesora)) ? String(input.asesora) : '';
  if (!asesora) throw new ValidationError('Selecciona la asesora que atendió la venta.');

  const estado = String(input.estado || '').trim().slice(0, 60);
  const ciudad = String(input.ciudad || '').trim().slice(0, 80);
  const direccion = String(input.direccion || '').trim().slice(0, 300);
  if (!estado || !ciudad || !direccion) throw new ValidationError('Indica estado, ciudad y dirección de entrega.');

  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1));
  let totalAmount = Math.max(0, Number(input.totalAmount) || 0);
  let unitPrice = Number(input.unitPrice) || 0;
  if (unitPrice > 0 && totalAmount <= 0) totalAmount = Number((unitPrice * quantity).toFixed(2));
  if (unitPrice <= 0) unitPrice = Number((totalAmount / quantity).toFixed(2));
  if (totalAmount <= 0) throw new ValidationError('Indica el monto pagado en USD.');

  const paymentMethod = (VALID_METHODS as readonly string[]).includes(String(input.paymentMethod))
    ? (String(input.paymentMethod) as CustomerSaleRecord['paymentMethod'])
    : 'Transferencia';
  const paymentType: CustomerSaleRecord['paymentType'] = input.paymentType === 'Abono inicial' ? 'Abono inicial' : 'Pago completo';
  const paymentReference = String(input.paymentReference || '').trim().slice(0, 80);
  if (paymentMethod !== 'Efectivo' && !paymentReference) {
    throw new ValidationError('Indica la referencia de la transferencia o el titular/confirmación de Zelle.');
  }
  const notes = String(input.notes || '').trim().slice(0, 500);

  const receiptId = newReceiptId();
  const image = saveReceiptImage(input.receiptImage, receiptId) ?? undefined;
  if (!image && paymentMethod !== 'Efectivo' && source === 'portal-cliente') {
    throw new ValidationError('Adjunta la captura del comprobante de pago.');
  }

  // Motor de validación contra lo que ya está en la hoja
  const existing = await getRecords().catch(() => [] as CustomerSaleRecord[]);
  const draft = {
    customerName,
    customerEmail,
    customerPhone,
    productName,
    category: String(input.category || ''),
    quantity,
    unitPrice,
    totalAmount,
    paymentMethod,
    paymentType,
    paymentReference,
    status: 'Pendiente' as const,
    notes,
  };
  const evalResult = evaluateSaleRecord(draft, existing);

  const record: CustomerSaleRecord = {
    id: receiptId,
    timestamp: nowInVenezuela(),
    purchaseDate: todayInVenezuela(), // la fija el servidor, nunca el cliente
    customerName: evalResult.normalizedData.customerName,
    cedula,
    customerEmail: evalResult.normalizedData.customerEmail,
    customerPhone: evalResult.normalizedData.customerPhone,
    estado,
    ciudad,
    direccion,
    asesora,
    productName,
    category: draft.category || evalResult.suggestedCategory,
    quantity,
    unitPrice,
    totalAmount: evalResult.normalizedData.totalAmount,
    paymentMethod,
    paymentType,
    paymentReference,
    receiptImageUrl: image ? `${PUBLIC_URL}${image.publicUrl}` : '',
    status: source === 'panel-asesora' ? 'Verificado' : 'Pendiente',
    source,
    notes: notes || (source === 'portal-cliente' ? 'Registrado por el cliente desde el portal' : `Registrado por ${asesora} desde el panel`),
    smartValidation: {
      score: evalResult.score,
      riskLevel: evalResult.riskLevel,
      isDuplicatePotential: evalResult.isDuplicatePotential,
      anomalies: evalResult.anomalies,
      suggestedCategory: evalResult.suggestedCategory,
    },
  };

  if (!isGoogleConfigured()) {
    const pending = loadPending();
    pending.push({ record, image, attempts: 0, queuedAt: new Date().toISOString(), lastError: 'Google no configurado' });
    savePending(pending);
    return { record, queued: true };
  }

  try {
    const final = await writeToGoogle(record, image);
    return { record: final, queued: false };
  } catch (err: any) {
    const pending = loadPending();
    pending.push({ record, image, attempts: 1, queuedAt: new Date().toISOString(), lastError: err.message });
    savePending(pending);
    console.error(`[Ventas] Google falló para ${receiptId}, quedó en cola: ${err.message}`);
    return { record, queued: true };
  }
}

/** Cambia el estado de un registro (Pendiente → Verificado / Completado) en la hoja. */
export async function setRecordStatus(id: string, status: CustomerSaleRecord['status']): Promise<CustomerSaleRecord> {
  const cfg = getGoogleConfig();
  if (!cfg || !isGoogleConfigured()) throw new Error('Google no está configurado.');
  const records = await getRecords(true);
  const target = records.find((r) => r.id === id);
  if (!target || !target.sheetsRowIndex) throw new ValidationError(`No se encontró el registro ${id} en la hoja.`);
  await updateCell(cfg, target.sheetsRowIndex, COL['Estado del Registro'], status);
  invalidateCache();
  return { ...target, status };
}

export async function prepareSheet(): Promise<void> {
  const cfg = getGoogleConfig();
  if (!cfg || !isGoogleConfigured()) return;
  await ensureSheetHeaders(cfg, [...SHEET_COLUMNS]);
}
