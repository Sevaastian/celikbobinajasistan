import { MessageCircle } from "lucide-react";
import { btnGhost } from "@/components/ui";
import { orderMessages, whatsappLink } from "@/lib/whatsapp";

type Order = Parameters<typeof orderMessages>[1];

/** İş emri sayfasında: müşteriye hazır mesajla WhatsApp'ı açan menü. */
export function WhatsAppMenu({ customer, phone, order }: { customer: string; phone: string | null; order: Order }) {
  if (!phone) return null;
  if (!whatsappLink(phone)) {
    return <span className={btnGhost + " cursor-not-allowed opacity-60"} title="Müşterinin telefon numarası WhatsApp için geçerli görünmüyor">
      <MessageCircle size={17} /> WhatsApp (numara geçersiz)
    </span>;
  }
  const messages = orderMessages(customer, order);
  return <details className="relative">
    <summary className={btnGhost + " cursor-pointer list-none [&::-webkit-details-marker]:hidden"}>
      <MessageCircle size={17} /> WhatsApp ile haber ver
    </summary>
    <div className="absolute right-0 z-30 mt-2 w-72 max-w-[85vw] rounded-xl border border-ink-600 bg-ink-800 p-2 shadow-xl">
      {messages.map(message => <a key={message.key} href={whatsappLink(phone, message.text)!} target="_blank" rel="noopener noreferrer"
        className="block rounded-lg px-3 py-2 text-sm hover:bg-ink-700">
        <span className="font-medium">{message.label}</span>
        {message.recommended && <span className="ml-2 rounded-full bg-accent-500/15 px-2 py-0.5 text-xs text-accent-400">Önerilen</span>}
        <span className="mt-0.5 line-clamp-2 block text-xs text-zinc-400">{message.text}</span>
      </a>)}
      <p className="px-3 pb-1 pt-2 text-xs text-zinc-500">WhatsApp açılır, mesajı göndermeden önce düzenleyebilirsiniz.</p>
    </div>
  </details>;
}
