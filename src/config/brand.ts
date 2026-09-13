// Datos de marca y contacto de INSUBLIMEX.
// Misma fuente que INSUBLIMEX-WEBSITE/src/config/site.js — si cambia allá, cambia acá.

export const BRAND = {
  name: 'INSUBLIMEX',
  tagline: 'Máquinas e insumos de sublimación',
  website: 'https://www.insublimexvnzla.com',
  instagram: 'https://www.instagram.com/insublimexvnzla',
  /** E.164 sin '+', formato que usa wa.me */
  whatsappNumber: '584120480294',
  whatsappDisplay: '+58 412-048-0294',
  contactEmail: 'Insublimexoperaciones@gmail.com',
  currency: 'USD',
  locale: 'es-VE',
  logo: '/brand/insublimex-logo.jpg',
  legal: {
    razonSocial: 'Hiper Insublimex de Leonardo León',
    rif: 'V-25159779-7',
    ciudad: 'Guanare',
    estado: 'Portuguesa',
    pais: 'Venezuela',
  },
} as const;

export const whatsappLink = (text?: string) =>
  `https://wa.me/${BRAND.whatsappNumber}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

/** Métodos de pago que Insublimex acepta según su web (sección "Cómo comprar" y FAQ). */
export const PAYMENT_METHODS = [
  { id: 'Transferencia', label: 'Transferencia bancaria', hint: 'Bs. o USD, cuenta que te indica el asesor' },
  { id: 'Zelle', label: 'Zelle', hint: 'Indica el nombre del titular y confirmación' },
  { id: 'Efectivo', label: 'Efectivo / Divisas', hint: 'Pago en tienda o contra entrega' },
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]['id'];

/** Para equipos de importación directa Insublimex pide una seña y el resto contra entrega. */
export const PAYMENT_TYPES = [
  { id: 'Pago completo', label: 'Pago completo' },
  { id: 'Abono inicial', label: 'Abono inicial (seña)' },
] as const;

export type PaymentTypeId = (typeof PAYMENT_TYPES)[number]['id'];

/**
 * Las asesoras NO se escriben en el código: el servidor las lee de la variable
 * ASESORAS del .env y las entrega en /api/public/purchase-date y /api/admin/config.
 */
export async function fetchAsesoras(): Promise<string[]> {
  try {
    const r = await fetch('/api/public/purchase-date');
    const d = r.ok ? await r.json() : null;
    return Array.isArray(d?.asesoras) ? d.asesoras : [];
  } catch {
    return [];
  }
}

/** Normaliza una cédula venezolana a "V-12345678" / "E-12345678". Devuelve null si no es válida. */
export function normalizeCedula(raw: string): string | null {
  const clean = raw.trim().toUpperCase().replace(/[\s.\-]/g, '');
  const m = clean.match(/^([VEJPG])?(\d{6,9})$/);
  if (!m) return null;
  return `${m[1] ?? 'V'}-${m[2]}`;
}

export const formatUSD = (n: number) =>
  new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
