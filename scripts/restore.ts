import "dotenv/config";
import fs from "node:fs";
import readline from "node:readline";
import { getDb } from "../src/db";
import { inspectBackup, restoreBackup, type BackupDb } from "../src/lib/backup";

const file = process.argv[2];
const confirmed = process.argv.includes("--onayla");

function lines() {
  return readline.createInterface({ input: fs.createReadStream(file, "utf8"), crlfDelay: Infinity });
}

async function main() {
  if (!file || file.startsWith("--")) {
    console.error("Kullanım: npm run db:restore -- yedek-dosyasi.ndjson --onayla");
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`Dosya bulunamadı: ${file}`);
    process.exit(1);
  }
  const { header, counts } = await inspectBackup(lines());
  console.log(`Yedek tarihi: ${header.tarih}  (fotoğraf içerikleri ${header.fotografIcerigi ? "dahil" : "dahil değil"})`);
  for (const [name, count] of counts) console.log(`  ${name}: ${count} satır`);

  if (!confirmed) {
    console.log("\nBu işlem veritabanındaki TÜM mevcut verileri silip yedekten geri yükler.");
    console.log("Onaylamak için komuta --onayla ekleyin.");
    process.exit(1);
  }
  await restoreBackup(getDb() as unknown as BackupDb, lines(), (m) => console.log(m));
  console.log("Geri yükleme tamamlandı.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
