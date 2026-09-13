import { CustomerSaleRecord } from '../types';
import { CATALOG_CATEGORIES, CATALOG_PRODUCTS, CatalogProduct } from '../data/catalogo';

/**
 * Motor de validación de INSUBLIMEX:
 * - Normaliza nombre, correo y teléfono (formato venezolano +58).
 * - Detecta duplicados (mismo cliente + mismo producto) y referencias de pago repetidas.
 * - Contrasta el monto contra el precio del catálogo real (avisa si no cuadra).
 * - Asigna la categoría del catálogo (Combos, Plotters, Prensas, Costura, Insumos).
 * - Calcula un score de calidad 0-100.
 */

export interface ValidationResult {
  score: number;
  riskLevel: 'bajo' | 'medio' | 'alto';
  isDuplicatePotential: boolean;
  anomalies: string[];
  suggestedCategory: string;
  catalogMatch: CatalogProduct | null;
  normalizedData: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    totalAmount: number;
  };
}

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATALOG_CATEGORIES.map((c) => [c.id, c.label])
);

export const CATEGORY_LABELS = CATALOG_CATEGORIES.map((c) => c.label);
export const DEFAULT_CATEGORY = 'Otro / Consultar';

// Palabras clave para productos escritos a mano que no están en el catálogo.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  combos: ['combo', 'kit iniciador', 'kit emprendedor', 'paquete'],
  plotters: ['plotter', 'ecotank', 'epson', 'impresora', 'cameo', 'silhouette', 'proccut', 'corte'],
  prensas: ['prensa', 'plancha', 'termofijadora', 'gorras', 'tazas', 'tasas', 'termos', 'horno', 'sublimadora', 'heat press'],
  costura: ['costura', 'coser', 'overlock', 'collaretera', 'recta', 'bordado', 'cortadora', 'ojaladora', 'botonadora', 'kingter'],
  insumos: ['tinta', 'papel', 'resma', 'vinil', 'cinta', 'spray', 'chip', 'engomado', 'lámina', 'lamina', 'guante', 'cabezal', 'cartucho', 'resorte', 'teflón', 'teflon', 'poliamida', 'damper', 'film', 'dtf'],
};

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/** Busca el producto del catálogo por nombre exacto (ignorando acentos y mayúsculas). */
export function findCatalogProduct(productName: string): CatalogProduct | null {
  const key = fold(productName);
  if (!key) return null;
  return CATALOG_PRODUCTS.find((p) => fold(p.name) === key) ?? null;
}

export function autoCategorize(productName: string): string {
  const match = findCatalogProduct(productName);
  if (match) return CATEGORY_LABEL[match.category];

  const lower = fold(productName);
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(fold(k)))) {
      return CATEGORY_LABEL[cat];
    }
  }
  return DEFAULT_CATEGORY;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normaliza teléfonos venezolanos a E.164 (+58XXXXXXXXXX).
 * Acepta "0412-0480294", "412 048 0294", "+58 412 048 0294", "58412...".
 * Números de otros países con "+" se dejan como vienen.
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) {
    return cleaned.startsWith('+58') ? cleaned : cleaned;
  }
  const digits = cleaned.replace(/\D/g, '');
  if (digits.startsWith('58') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+58${digits.slice(1)}`;
  if (digits.length === 10) return `+58${digits}`;
  return cleaned;
}

export function isVenezuelanMobile(e164: string): boolean {
  // Operadoras: 412 (Digitel), 414/424 (Movistar), 416/426 (Movilnet), 422 (Digitel)
  return /^\+58(412|414|416|422|424|426)\d{7}$/.test(e164);
}

export function capitalizeName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function evaluateSaleRecord(
  newRecord: Omit<CustomerSaleRecord, 'id' | 'timestamp' | 'smartValidation'>,
  existingRecords: CustomerSaleRecord[]
): ValidationResult {
  const anomalies: string[] = [];
  let score = 100;
  let isDuplicatePotential = false;

  const normalizedName = capitalizeName(newRecord.customerName);
  const normalizedEmail = normalizeEmail(newRecord.customerEmail);
  const normalizedPhone = normalizePhone(newRecord.customerPhone);
  const calculatedTotal = Number((newRecord.quantity * newRecord.unitPrice).toFixed(2));
  const catalogMatch = findCatalogProduct(newRecord.productName);

  // 1. Campos básicos
  if (normalizedName.length < 3) {
    anomalies.push('Nombre de cliente demasiado corto.');
    score -= 20;
  } else if (!normalizedName.includes(' ')) {
    anomalies.push('Falta el apellido del cliente.');
    score -= 5;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    anomalies.push('Formato de correo electrónico no válido.');
    score -= 25;
  }

  if (!normalizedPhone) {
    anomalies.push('Sin teléfono/WhatsApp: no se podrá contactar al cliente para la entrega.');
    score -= 15;
  } else if (normalizedPhone.startsWith('+58') && !isVenezuelanMobile(normalizedPhone)) {
    anomalies.push(`Teléfono ${normalizedPhone} no parece un celular venezolano válido (04XX + 7 dígitos).`);
    score -= 10;
  } else if (normalizedPhone.replace(/\D/g, '').length < 10) {
    anomalies.push('Teléfono con dígitos insuficientes.');
    score -= 15;
  }

  // 2. Consistencia de montos
  if (newRecord.quantity <= 0) {
    anomalies.push('La cantidad debe ser mayor a cero.');
    score -= 30;
  }

  if (newRecord.unitPrice <= 0) {
    anomalies.push('El monto debe ser mayor a cero.');
    score -= 25;
  }

  if (Math.abs(newRecord.totalAmount - calculatedTotal) > 0.05) {
    anomalies.push(
      `Inconsistencia: ${newRecord.quantity} × $${newRecord.unitPrice} = $${calculatedTotal}, pero se ingresó $${newRecord.totalAmount}.`
    );
    score -= 20;
  }

  // 3. Contraste contra el catálogo real
  if (catalogMatch && catalogMatch.price != null && newRecord.unitPrice > 0) {
    const expected = catalogMatch.price;
    const diffPct = ((newRecord.unitPrice - expected) / expected) * 100;
    const isDeposit = newRecord.paymentType === 'Abono inicial';
    if (diffPct > 5) {
      anomalies.push(
        `Precio unitario $${newRecord.unitPrice} supera el de catálogo ($${expected}) en ${diffPct.toFixed(0)}%. Verificar.`
      );
      score -= 15;
    } else if (diffPct < -5 && !isDeposit) {
      anomalies.push(
        `Precio unitario $${newRecord.unitPrice} está ${Math.abs(diffPct).toFixed(0)}% por debajo del catálogo ($${expected}). Si es una seña, márcala como "Abono inicial".`
      );
      score -= 10;
    }
  } else if (!catalogMatch && newRecord.productName.trim()) {
    anomalies.push('Producto no está en el catálogo: se registra tal cual, revisar nombre y precio.');
    score -= 5;
  }

  // 4. Duplicados
  const sameCustomerSameProduct = existingRecords.find((r) => {
    const emailMatch = normalizeEmail(r.customerEmail) === normalizedEmail;
    const phoneMatch = normalizedPhone.length > 6 && normalizePhone(r.customerPhone) === normalizedPhone;
    const sameProduct = fold(r.productName) === fold(newRecord.productName);
    return (emailMatch || phoneMatch) && sameProduct;
  });

  if (sameCustomerSameProduct) {
    isDuplicatePotential = true;
    anomalies.push(
      `Posible duplicado: ya existe un registro de este cliente para "${newRecord.productName}" (${sameCustomerSameProduct.id}).`
    );
    score -= 25;
  }

  const ref = newRecord.paymentReference?.trim();
  if (ref) {
    const sameRef = existingRecords.find(
      (r) => r.paymentReference && r.paymentReference.trim().toLowerCase() === ref.toLowerCase()
    );
    if (sameRef) {
      isDuplicatePotential = true;
      anomalies.push(`La referencia de pago "${ref}" ya fue usada en el registro ${sameRef.id}.`);
      score -= 30;
    }
  }

  // 5. Categoría y nivel de riesgo
  const suggestedCategory = autoCategorize(newRecord.productName);

  score = Math.max(10, Math.min(100, score));
  let riskLevel: 'bajo' | 'medio' | 'alto' = 'bajo';
  if (score < 60) {
    riskLevel = 'alto';
  } else if (score < 85) {
    riskLevel = 'medio';
  }

  return {
    score,
    riskLevel,
    isDuplicatePotential,
    anomalies,
    suggestedCategory,
    catalogMatch,
    normalizedData: {
      customerName: normalizedName,
      customerEmail: normalizedEmail,
      customerPhone: normalizedPhone,
      totalAmount: calculatedTotal > 0 ? calculatedTotal : newRecord.totalAmount,
    },
  };
}
