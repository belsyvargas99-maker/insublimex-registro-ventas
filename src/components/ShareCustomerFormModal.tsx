import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Globe,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Lock,
} from 'lucide-react';

interface ShareCustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreview: () => void;
}

export const ShareCustomerFormModal: React.FC<ShareCustomerFormModalProps> = ({
  isOpen,
  onClose,
  onOpenPreview,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const customerFormUrl = `${currentOrigin}?portal=cliente`;

  const whatsappMessage = `¡Gracias por tu compra en INSUBLIMEX! 🙌

Para dejar tu pago registrado, completa este formulario (te toma 1 minuto):
👉 ${customerFormUrl}

Ahí eliges tu producto, indicas cómo pagaste y el número de referencia. Al terminar te da un N° de comprobante: envíamelo por aquí y te confirmo la entrega.`;

  const embedCode = `<iframe src="${customerFormUrl}" width="100%" height="800" frameborder="0"></iframe>`;

  const handleCopy = (text: string, type: 'link' | 'whatsapp' | 'embed') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === 'whatsapp') {
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2000);
    } else {
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto font-sans">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Enlace para que el cliente registre su pago
            </h2>
            <p className="text-xs text-slate-500">
              Envíaselo por WhatsApp apenas te confirme que pagó. Él llena sus datos y a ti te aparece en el panel y en la hoja.
            </p>
          </div>
        </div>

        {/* Strong Security & Isolation Guarantee Banner */}
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-300/80 rounded-xl flex items-start gap-2.5 text-xs text-emerald-950 shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-bold block text-emerald-950 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-700 inline" /> El cliente solo ve su formulario
            </span>
            <p className="text-emerald-900">
              Con este enlace el cliente <strong>no puede entrar al panel ni ver tu Google Sheet</strong>. Solo registra su propio pago y recibe un número de comprobante.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Direct Link Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                Enlace para el cliente
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-bold">
                Solo formulario
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={customerFormUrl}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-[11px] font-mono text-slate-800 select-all font-semibold"
              />
              <button
                type="button"
                onClick={() => handleCopy(customerFormUrl, 'link')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-500">
                Optimizado para celulares, tablets y computadoras.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPreview();
                }}
                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold text-[11px] cursor-pointer"
              >
                <span>Ver como cliente</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* WhatsApp Pre-written Template */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                Mensaje listo para WhatsApp
              </span>
              <button
                type="button"
                onClick={() => handleCopy(whatsappMessage, 'whatsapp')}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                {copiedWhatsApp ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedWhatsApp ? 'Mensaje Copiado' : 'Copiar Mensaje'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Cópialo y pégalo en el chat del cliente cuando te avise que pagó:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-700 whitespace-pre-line font-sans">
              {whatsappMessage}
            </div>
          </div>

          {/* Embed / Web Placement */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                Incrustar en insublimexvnzla.com (iframe)
              </span>
              <button
                type="button"
                onClick={() => handleCopy(embedCode, 'embed')}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                {copiedEmbed ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedEmbed ? 'Código Copiado' : 'Copiar iframe'}</span>
              </button>
            </div>
            <input
              type="text"
              readOnly
              value={embedCode}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-600 select-all"
            />
          </div>

          {/* How the Automation Operates */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-700 space-y-1">
            <span className="font-bold block flex items-center gap-1 text-slate-900">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Cómo funciona
            </span>
            <p className="text-slate-600 leading-relaxed">
              1. Cierras la venta por WhatsApp y el cliente paga (transferencia, Zelle o efectivo).<br />
              2. Le mandas el enlace; él elige el producto del catálogo, el monto y la referencia de pago.<br />
              3. El registro aparece en tu panel como <strong>Pendiente</strong>, con precio de catálogo contrastado y referencias repetidas detectadas, y <strong>se escribe en tu Google Sheet</strong> mientras tengas este panel abierto.<br />
              4. El cliente recibe un N° de comprobante y puede reenviártelo por WhatsApp con un botón.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPreview();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ver como cliente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
