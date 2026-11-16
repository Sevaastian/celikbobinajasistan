import path from "node:path";
import PDFDocument from "pdfkit";

export type DocumentData = {
  kind: "teklif" | "teslim";
  number: string;
  date: string;
  customer: string;
  phone: string | null;
  deviceType: string;
  brand: string | null;
  model: string | null;
  serialNo: string | null;
  quantity: number;
  receivedAt: string;
  complaint: string | null;
  diagnosis: string | null;
  plannedWork: string | null;
  items: { name: string; quantity: string; unit: string; unitPrice: string; total: string }[];
  estimated: string | null;
  final: string | null;
  paid: string | null;
  remaining: string | null;
  business: { name: string; phone?: string; address?: string };
};

const INK = "#172033";
const MUTED = "#475569";
const LINE = "#cbd5e1";

/** Tek sayfalık, imzalanabilir fiyat teklifi / teslim fişi. */
export function renderDocument(data: DocumentData): Promise<Buffer> {
  const teklif = data.kind === "teklif";
  const title = teklif ? "FİYAT TEKLİFİ" : "TESLİM FİŞİ";
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 40, info: { Title: `${title} ${data.number}` } });
    const chunks: Buffer[] = [];
    pdf.on("data", chunk => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
    pdf.font(path.join(process.cwd(), "src", "assets", "NotoSans-Report.ttf"));

    const left = 40;
    const width = pdf.page.width - 80;
    const ensure = (needed: number) => { if (pdf.y > pdf.page.height - 40 - needed) pdf.addPage(); };

    // Başlık
    pdf.fontSize(20).fillColor(INK).text(data.business.name, left, 40, { width: width * 0.6 });
    const contact = [data.business.phone, data.business.address].filter(Boolean).join(" · ");
    if (contact) pdf.fontSize(9).fillColor(MUTED).text(contact, left, pdf.y + 2, { width: width * 0.6 });
    const headerBottom = pdf.y;
    pdf.fontSize(17).fillColor(INK).text(title, left, 40, { width, align: "right" });
    pdf.fontSize(10).fillColor(MUTED).text(`İş emri: ${data.number}`, left, 64, { width, align: "right" });
    pdf.text(`Tarih: ${data.date}`, left, 78, { width, align: "right" });
    pdf.y = Math.max(headerBottom, 96) + 10;
    pdf.moveTo(left, pdf.y).lineTo(left + width, pdf.y).strokeColor(INK).lineWidth(1.2).stroke();
    pdf.y += 12;

    // Müşteri ve cihaz
    const info: [string, string | null][] = [
      ["Müşteri", data.customer], ["Telefon", data.phone], ["Cihaz türü", data.deviceType],
      ["Marka / model", [data.brand, data.model].filter(Boolean).join(" ") || null],
      ["Seri numarası", data.serialNo], ["Geliş tarihi", data.receivedAt],
      ...(data.quantity > 1 ? [["Adet", `${data.quantity} adet (ücret toplamdır)`] as [string, string]] : []),
    ];
    const colWidth = width / 2 - 8;
    const startY = pdf.y;
    info.forEach(([label, value], index) => {
      const x = left + (index % 2) * (colWidth + 16);
      const y = startY + Math.floor(index / 2) * 34;
      pdf.fontSize(8.5).fillColor(MUTED).text(label, x, y, { width: colWidth });
      pdf.fontSize(10.5).fillColor(INK).text(value || "—", x, y + 11, { width: colWidth, height: 16, ellipsis: true });
    });
    pdf.y = startY + Math.ceil(info.length / 2) * 34 + 4;

    // Metin blokları
    const block = (label: string, value: string | null) => {
      if (!value) return;
      ensure(50);
      pdf.fontSize(8.5).fillColor(MUTED).text(label, left, pdf.y, { width });
      pdf.fontSize(10.5).fillColor(INK).text(value, left, pdf.y + 2, { width }).moveDown(0.6);
    };
    block("Arıza şikâyeti", data.complaint);
    block("Arıza tespiti", data.diagnosis);
    block("Yapılacak işlemler", data.plannedWork);

    // Malzemeler
    if (data.items.length) {
      ensure(40 + data.items.length * 16);
      pdf.moveDown(0.3);
      const cols = [width * 0.46, width * 0.14, width * 0.2, width * 0.2];
      const headers = ["Malzeme", "Miktar", "Birim fiyat", "Tutar"];
      let y = pdf.y;
      pdf.rect(left, y - 3, width, 18).fillColor("#e2e8f0").fill();
      let x = left;
      headers.forEach((h, i) => {
        pdf.fontSize(9).fillColor(INK).text(h, x + 4, y + 1, { width: cols[i] - 8, align: i === 0 ? "left" : "right" });
        x += cols[i];
      });
      y += 20;
      for (const item of data.items) {
        if (y > pdf.page.height - 120) { pdf.addPage(); y = 40; }
        x = left;
        [item.name, `${item.quantity} ${item.unit}`, item.unitPrice, item.total].forEach((cell, i) => {
          pdf.fontSize(9.5).fillColor(INK).text(cell, x + 4, y, { width: cols[i] - 8, align: i === 0 ? "left" : "right", height: 13, ellipsis: true });
          x += cols[i];
        });
        y += 16;
        pdf.moveTo(left, y - 2).lineTo(left + width, y - 2).strokeColor(LINE).lineWidth(0.5).stroke();
      }
      pdf.y = y + 6;
    }

    // Tutarlar
    ensure(120);
    const totals: [string, string, boolean][] = teklif
      ? [["Tahmini ücret", data.estimated ?? "Belirlenmedi", true]]
      : [
          [data.final ? "Kesin ücret" : "Tahmini ücret", data.final ?? data.estimated ?? "Belirlenmedi", true],
          ["Tahsil edilen", data.paid ?? "0,00", false],
          ["Kalan", data.remaining ?? "—", true],
        ];
    const boxX = left + width * 0.55;
    const boxW = width * 0.45;
    let ty = pdf.y + 4;
    for (const [label, value, strong] of totals) {
      pdf.fontSize(strong ? 11.5 : 10).fillColor(strong ? INK : MUTED).text(label, boxX, ty, { width: boxW * 0.5 });
      pdf.fontSize(strong ? 12.5 : 10).fillColor(INK).text(value, boxX + boxW * 0.4, ty, { width: boxW * 0.6, align: "right" });
      ty += strong ? 22 : 18;
    }
    pdf.y = ty + 4;
    pdf.fontSize(8.5).fillColor(MUTED).text(
      teklif
        ? "Bu teklif tahminidir; arıza tespiti ve kullanılan malzemeye göre değişebilir. Onay verilmeden işleme başlanmaz."
        : "Cihaz yukarıda belirtilen bilgilerle teslim edilmiştir.",
      left, pdf.y, { width: width * 0.5 });

    // İmza alanları
    const signY = Math.max(pdf.y + 50, pdf.page.height - 150);
    if (signY > pdf.page.height - 70) pdf.addPage();
    const sy = Math.min(Math.max(signY, pdf.y + 30), pdf.page.height - 110);
    const labels = teklif
      ? ["Teklifi veren", "Müşteri onayı (ad soyad, imza, tarih)"]
      : ["Teslim eden", "Teslim alan (ad soyad, imza, tarih)"];
    labels.forEach((label, index) => {
      const x = left + index * (width / 2 + 10);
      const w = width / 2 - 10;
      pdf.moveTo(x, sy + 40).lineTo(x + w, sy + 40).strokeColor(INK).lineWidth(0.8).stroke();
      pdf.fontSize(9).fillColor(MUTED).text(label, x, sy + 46, { width: w });
    });
    pdf.end();
  });
}
