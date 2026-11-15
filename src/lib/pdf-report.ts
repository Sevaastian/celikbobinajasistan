import path from "node:path";
import PDFDocument from "pdfkit";
import type { Report } from "./report-data";

export function renderReport(report: Report): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 36, bufferPages: true, info: { Title: report.title } });
    const chunks: Buffer[] = [];
    pdf.on("data", chunk => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
    pdf.font(path.join(process.cwd(), "src", "assets", "NotoSans-Report.ttf"));
    pdf.fontSize(11).fillColor("#334155").text("ÇELİK BOBİNAJ").moveDown(0.4);
    pdf.fontSize(19).fillColor("#172033").text(report.title).moveDown();
    if (!report.rows.length) pdf.fontSize(10).text("Kayıt bulunamadı.");
    for (const row of report.rows) {
      if (pdf.y > pdf.page.height - 85) pdf.addPage();
      if (report.columns.length === 2) {
        pdf.fontSize(9).fillColor("#475569").text(String(row[0] ?? ""));
        pdf.fontSize(10).fillColor("#172033").text(String(row[1] ?? "—")).moveDown(0.8);
      } else {
        row.forEach((value, index) => pdf.fontSize(10).fillColor("#172033")
          .text(`${report.columns[index]} · ${value ?? "—"}`));
        pdf.moveDown(0.8);
      }
    }
    const pages = pdf.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      pdf.switchToPage(i);
      pdf.fontSize(8).fillColor("#475569").text(`${i + 1} / ${pages.count}`, 36, pdf.page.height - 29,
        { width: pdf.page.width - 72, align: "right", lineBreak: false });
    }
    pdf.end();
  });
}
