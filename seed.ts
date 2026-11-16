import "dotenv/config";
import bcrypt from "bcryptjs";
import { wireSizes } from "../lib/wire-sizes";
import { getDb, schema } from "./index";

const { users, technicalFields, repairOperations, stockItems } = schema;

/**
 * Sistem teknik alanları. Etiketler olduğu gibi saklanır:
 * "HİW" yazımı korunur; Sipir, Hatve ve HİW üç ayrı bağımsız alandır.
 */
const SYSTEM_FIELDS: { key: string; label: string }[] = [
  { key: "hvc", label: "HVC" },
  { key: "sipir", label: "Sipir" },
  { key: "hatve", label: "Hatve" },
  { key: "hiw", label: "HİW" },
  { key: "tel_capi", label: "Tel çapı (mm)" },
  { key: "paralel_tel", label: "Paralel tel sayısı" },
  { key: "bobin_sayisi", label: "Bobin sayısı" },
  { key: "oluk_bilgileri", label: "Oluk bilgileri" },
  { key: "sarim_baglantisi", label: "Sarım bağlantısı" },
  { key: "sarim_sekli", label: "Sarım şekli" },
  { key: "izolasyon", label: "İzolasyon bilgileri" },
  { key: "teknik_aciklama", label: "Teknik açıklamalar" },
];

const PRESET_OPERATIONS = [
  "Kömür değişimi",
  "Endüvi değişimi",
  "Stator değişimi",
  "Rulman değişimi",
  "Şalter değişimi",
  "Kablo değişimi",
  "Mandren değişimi",
  "Dişli değişimi",
];

async function main() {
  const db = getDb();

  // İlk yönetici
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const password = process.env.SEED_ADMIN_PASSWORD;
  const anyUser = await db.select({ id: users.id }).from(users).limit(1);
  if ((!password || password.length < 8) && anyUser.length === 0) {
    throw new Error("İlk kurulum için SEED_ADMIN_PASSWORD (en az 8 karakter) tanımlanmalı.");
  }
  if (!password || password.length < 8) {
    console.log("SEED_ADMIN_PASSWORD yok, yönetici adımı atlandı.");
  } else if (anyUser.length === 0) {
    await db.insert(users).values({
      username,
      fullName: process.env.SEED_ADMIN_NAME ?? "Yönetici",
      passwordHash: await bcrypt.hash(password, 12),
      role: "yonetici",
    }).onConflictDoNothing({ target: users.username });
    console.log(`Yönetici oluşturuldu: ${username}`);
  } else {
    console.log("Yönetici zaten var, atlandı.");
  }

  // Sistem teknik alanları (yalnızca eksik olanlar eklenir, mevcutlar değiştirilmez)
  const existingFields = await db.select({ key: technicalFields.key }).from(technicalFields);
  const have = new Set(existingFields.map((f) => f.key));
  const toAdd = SYSTEM_FIELDS.filter((f) => !have.has(f.key));
  if (toAdd.length) {
    await db.insert(technicalFields).values(
      toAdd.map((f, i) => ({
        key: f.key,
        label: f.label,
        deviceTypes: ["motor"],
        sortOrder: i,
        isSystem: true,
      })),
    );
  }

  // Hazır tamir işlemleri
  const existingOps = await db.select({ name: repairOperations.name }).from(repairOperations);
  const haveOps = new Set(existingOps.map((o) => o.name));
  const opsToAdd = PRESET_OPERATIONS.filter((n) => !haveOps.has(n));
  if (opsToAdd.length) {
    await db.insert(repairOperations).values(opsToAdd.map((name) => ({ name, deviceType: "el_aleti" as const })));
  }

  // Örnek tel stokları
  const existingStock = await db.select({ id: stockItems.id }).from(stockItems).limit(1);
  if (existingStock.length === 0) {
    await db.insert(stockItems).values(
      wireSizes.map((d) => ({
        name: `Emaye bakır tel ${d} mm`,
        category: "emaye_bakir_tel" as const,
        wireDiameter: d,
        unit: "kg",
      })),
    );
  }

  console.log("Seed tamamlandı.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
