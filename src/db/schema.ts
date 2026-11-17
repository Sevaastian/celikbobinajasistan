import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  boolean,
  numeric,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enum'lar                                                            */
/* ------------------------------------------------------------------ */

export const roleEnum = pgEnum("rol", ["yonetici", "usta", "personel"]);

export const deviceTypeEnum = pgEnum("cihaz_turu", [
  "motor",
  "el_aleti",
  "jenerator",
  "pompa",
  "diger",
  "dalgic",
  "fan_motoru",
  "alternator",
  "su_motoru",
]);

export const workStatusEnum = pgEnum("is_durumu", [
  "yeni_geldi",
  "incelemede",
  "ariza_tespit_edildi",
  "musteri_onayi_bekliyor",
  "islemde",
  "parca_bekliyor",
  "test_asamasinda",
  "tamamlandi",
  "teslime_hazir",
  "teslim_edildi",
  "iptal_edildi",
]);

export const stockCategoryEnum = pgEnum("stok_kategorisi", [
  "emaye_bakir_tel",
  "izolasyon",
  "rulman",
  "komur",
  "enduvi",
  "stator",
  "salter",
  "kablo",
  "kondansator",
  "diger",
]);

export const stockMovementTypeEnum = pgEnum("stok_hareket_turu", [
  "giris",
  "cikis",
  "sayim_duzeltme",
  "iade",
]);

export const paymentMethodEnum = pgEnum("odeme_yontemi", [
  "nakit",
  "havale_eft",
  "kredi_karti",
]);

export const photoKindEnum = pgEnum("fotograf_turu", [
  "ilk_gelis",
  "sokum",
  "eski_sargi",
  "sarim_asamasi",
  "bitmis_motor",
  "genel",
]);

export const fieldTypeEnum = pgEnum("alan_tipi", ["metin", "sayi", "secim"]);

/* ------------------------------------------------------------------ */
/* Kullanıcılar ve işlem geçmişi                                       */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "kullanicilar",
  {
    id: serial("id").primaryKey(),
    username: text("kullanici_adi").notNull(),
    fullName: text("ad_soyad").notNull(),
    passwordHash: text("sifre_hash").notNull(),
    role: roleEnum("rol").notNull().default("personel"),
    active: boolean("aktif").notNull().default(true),
    createdAt: timestamp("olusturma_tarihi", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ usernameIdx: uniqueIndex("kullanici_adi_uq").on(t.username) }),
);

/** Giriş denemesi sınırı: kullanıcı+IP ve yalnızca IP bazında başarısız deneme sayacı. */
export const loginAttempts = pgTable("giris_denemeleri", {
  key: text("anahtar").primaryKey(),
  attempts: integer("deneme").notNull().default(0),
  windowStartedAt: timestamp("pencere_basi", { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp("kilit_bitis", { withTimezone: true }),
});

export const activityLogs = pgTable(
  "islem_gecmisi",
  {
    id: serial("id").primaryKey(),
    userId: integer("kullanici_id").references(() => users.id, { onDelete: "set null" }),
    action: text("islem").notNull(), // olustur | guncelle | sil | giris | durum_degisti ...
    entity: text("varlik").notNull(), // musteri, is_emri, bobinaj ...
    entityId: integer("varlik_id"),
    details: jsonb("detay"),
    createdAt: timestamp("tarih", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ entityIdx: index("islem_varlik_idx").on(t.entity, t.entityId) }),
);

/* ------------------------------------------------------------------ */
/* Müşteriler ve tedarikçiler                                          */
/* ------------------------------------------------------------------ */

export const customers = pgTable(
  "musteriler",
  {
    id: serial("id").primaryKey(),
    name: text("ad_firma").notNull(),
    phone: text("telefon"),
    address: text("adres"),
    notes: text("notlar"),
    createdAt: timestamp("kayit_tarihi", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    nameIdx: index("musteri_ad_idx").on(t.name),
    phoneIdx: index("musteri_tel_idx").on(t.phone),
  }),
);

export const suppliers = pgTable("tedarikciler", {
  id: serial("id").primaryKey(),
  name: text("ad").notNull(),
  phone: text("telefon"),
  address: text("adres"),
  notes: text("notlar"),
  createdAt: timestamp("kayit_tarihi", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* İş emirleri                                                         */
/* ------------------------------------------------------------------ */

export const workOrders = pgTable(
  "is_emirleri",
  {
    id: serial("id").primaryKey(),
    extra: jsonb("ek_alanlar").$type<Record<string, string | number | null>>().notNull().default({}),
    number: text("is_emri_no").notNull(), // örn. CB-2026-00012
    customerId: integer("musteri_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    deviceType: deviceTypeEnum("cihaz_turu").notNull().default("motor"),
    brand: text("marka"),
    model: text("model"),
    serialNo: text("seri_no"),
    /** Motor plakasından kabulde girilen değerler (benzer motor önerisi ve söküm formu ön doldurması için). */
    plateKw: numeric("plaka_kw", { precision: 10, scale: 3 }),
    plateVolt: text("plaka_volt"),
    plateRpm: integer("plaka_rpm"),
    platePoles: integer("plaka_kutup"),
    /** Aynı işten kaç adet geldiği. Ücretler tüm adetin toplamıdır. */
    quantity: integer("adet").notNull().default(1),
    receivedAt: timestamp("gelis_tarihi", { withTimezone: true }).notNull().defaultNow(),
    complaint: text("ariza_sikayeti"),
    diagnosis: text("ariza_tespiti"),
    plannedWork: text("yapilacak_islemler"),
    estimatedPrice: numeric("tahmini_ucret", { precision: 12, scale: 2 }),
    finalPrice: numeric("kesin_ucret", { precision: 12, scale: 2 }),
    assignedUserId: integer("atanan_kullanici_id").references(() => users.id, { onDelete: "set null" }),
    deliveredAt: timestamp("teslim_tarihi", { withTimezone: true }),
    status: workStatusEnum("durum").notNull().default("yeni_geldi"),
    createdBy: integer("olusturan_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("olusturma_tarihi", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("guncelleme_tarihi", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    numberIdx: uniqueIndex("is_emri_no_uq").on(t.number),
    customerIdx: index("is_emri_musteri_idx").on(t.customerId),
    statusIdx: index("is_emri_durum_idx").on(t.status),
    serialIdx: index("is_emri_seri_idx").on(t.serialNo),
  }),
);

export const workOrderStatusHistory = pgTable(
  "is_emri_durum_gecmisi",
  {
    id: serial("id").primaryKey(),
    workOrderId: integer("is_emri_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    fromStatus: workStatusEnum("onceki_durum"),
    toStatus: workStatusEnum("yeni_durum").notNull(),
    userId: integer("kullanici_id").references(() => users.id, { onDelete: "set null" }),
    note: text("not"),
    createdAt: timestamp("tarih", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ woIdx: index("durum_gecmis_wo_idx").on(t.workOrderId) }),
);

/** İş emrinde kullanılan malzemeler — kayıt eklenince stoktan otomatik düşülür. */
export const workOrderItems = pgTable(
  "is_emri_malzemeleri",
  {
    id: serial("id").primaryKey(),
    workOrderId: integer("is_emri_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    stockItemId: integer("stok_id")
      .notNull()
      .references(() => stockItems.id, { onDelete: "restrict" }),
    quantity: numeric("miktar", { precision: 12, scale: 3 }).notNull(),
    unitPrice: numeric("birim_fiyat", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("tarih", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ woIdx: index("wo_malzeme_wo_idx").on(t.workOrderId) }),
);

/* ------------------------------------------------------------------ */
/* Dinamik teknik alanlar (yönetici düzenler)                          */
/* ------------------------------------------------------------------ */

/**
 * Sistem alanları (sipir, hatve, hiw, ...) `isSystem = true` olarak seed edilir.
 * `label` değeri olduğu gibi saklanır: "HİW" hiçbir zaman dönüştürülmez.
 * Kullanıcı alanları değerlerini ilgili kaydın `extra` jsonb sütununda `key` ile saklar.
 */
export const technicalFields = pgTable(
  "teknik_alanlar",
  {
    id: serial("id").primaryKey(),
    key: text("anahtar").notNull(),
    label: text("etiket").notNull(),
    fieldType: fieldTypeEnum("tip").notNull().default("metin"),
    options: jsonb("secenekler").$type<string[]>(),
    deviceTypes: text("cihaz_turleri").array().notNull().default([]),
    sortOrder: integer("sira").notNull().default(0),
    isSystem: boolean("sistem_alani").notNull().default(false),
    active: boolean("aktif").notNull().default(true),
  },
  (t) => ({ keyIdx: uniqueIndex("teknik_alan_key_uq").on(t.key) }),
);

/* ------------------------------------------------------------------ */
/* Motor bobinaj teknik kayıtları                                      */
/* ------------------------------------------------------------------ */

export const windingRecords = pgTable(
  "bobinaj_kayitlari",
  {
    id: serial("id").primaryKey(),
    workOrderId: integer("is_emri_id").references(() => workOrders.id, { onDelete: "set null" }),
    customerId: integer("musteri_id").references(() => customers.id, { onDelete: "set null" }),
    /** Eski bir kayıttan kopyalandıysa kaynağı. Kaynak kayıt asla değiştirilmez. */
    copiedFromId: integer("kopya_kaynak_id").references((): AnyPgColumn => windingRecords.id, {
      onDelete: "set null",
    }),

    // Motor bilgileri
    brand: text("marka"),
    model: text("model"),
    serialNo: text("seri_no"),
    kw: numeric("kw", { precision: 10, scale: 3 }),
    hp: numeric("hp", { precision: 10, scale: 3 }),
    volt: text("volt"),
    phase: text("faz"),
    rpm: integer("rpm"),
    frequency: text("frekans"),
    poleCount: integer("kutup_sayisi"),
    slotCount: integer("oluk_sayisi"),
    connectionType: text("baglanti_tipi"),
    frameSize: text("govde_olcusu"),

    // Sargı bilgileri — SİPİR, HATVE ve HİW birbirinden bağımsız alanlardır.
    hvc: text("hvc"),
    sipir: text("sipir"),
    hatve: text("hatve"),
    /** Motorun hangi kalıpla sarıldığı (tekrar gelen işlerde aynı kalıbı bulmak için). */
    mold: text("kalip"),
    /** Monofaze motorlarda yardımcı bobinin sipir/hatve/tel bilgileri (ana bobin yukarıdaki alanlardır). */
    auxSipir: text("yardimci_sipir"),
    auxHatve: text("yardimci_hatve"),
    auxWireDiameters: numeric("yardimci_tel_caplari_mm", { precision: 6, scale: 3 }).array().notNull().default([]),
    hiw: text("hiw"),
    wireDiameter: numeric("tel_capi_mm", { precision: 6, scale: 3 }),
    secondWireDiameter: numeric("ikinci_tel_capi_mm", { precision: 6, scale: 3 }),
    additionalWireDiameters: numeric("ek_tel_caplari_mm", { precision: 6, scale: 3 }).array().notNull().default([]),
    parallelWires: integer("paralel_tel_sayisi"),
    coilCount: integer("bobin_sayisi"),
    /** Söküm sırasında tartılan her bobinin gramı (sırayla). Toplam her yerde bu listeden hesaplanır. */
    coilWeights: numeric("bobin_gramlari", { precision: 8, scale: 1 }).array().notNull().default([]),
    slotInfo: text("oluk_bilgileri"),
    windingConnection: text("sarim_baglantisi"),
    windingShape: text("sarim_sekli"),
    insulation: text("izolasyon_bilgileri"),
    notes: text("teknik_aciklamalar"),

    /** Yöneticinin eklediği özel teknik alanların değerleri: { anahtar: değer } */
    extra: jsonb("ek_alanlar").$type<Record<string, string | number | null>>().notNull().default({}),

    createdBy: integer("olusturan_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("olusturma_tarihi", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("guncelleme_tarihi", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    brandModelIdx: index("bobinaj_marka_model_idx").on(t.brand, t.model),
    sipirIdx: index("bobinaj_sipir_idx").on(t.sipir),
    hatveIdx: index("bobinaj_hatve_idx").on(t.hatve),
    hiwIdx: index("bobinaj_hiw_idx").on(t.hiw),
    wireIdx: index("bobinaj_tel_idx").on(t.wireDiameter),
    secondWireIdx: index("bobinaj_ikinci_tel_idx").on(t.secondWireDiameter),
    customerIdx: index("bobinaj_musteri_idx").on(t.customerId),
  }),
);

/* ------------------------------------------------------------------ */
/* El aletleri                                                         */
/* ------------------------------------------------------------------ */

export const repairOperations = pgTable("hazir_islemler", {
  id: serial("id").primaryKey(),
  name: text("ad").notNull(),
  deviceType: deviceTypeEnum("cihaz_turu").notNull().default("el_aleti"),
  active: boolean("aktif").notNull().default(true),
});

export const toolRepairs = pgTable(
  "el_aleti_tamirleri",
  {
    id: serial("id").primaryKey(),
    extra: jsonb("ek_alanlar").$type<Record<string, string | number | null>>().notNull().default({}),
    workOrderId: integer("is_emri_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    toolType: text("alet_turu"), // matkap, spiral, taşlama...
    brand: text("marka"),
    model: text("model"),
    serialNo: text("seri_no"),
    watt: integer("watt"),
    volt: text("volt"),
    fault: text("ariza"),
    diagnosis: text("tespit"),
    operations: text("yapilan_islemler").array().notNull().default([]),
    replacedParts: text("degistirilen_parcalar"),
    labor: numeric("iscilik", { precision: 12, scale: 2 }).notNull().default("0"),
    materialCost: numeric("malzeme_maliyeti", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("toplam_ucret", { precision: 12, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("olusturma_tarihi", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ woIdx: index("el_aleti_wo_idx").on(t.workOrderId) }),
);

/* ------------------------------------------------------------------ */
/* Jeneratörler ve periyodik bakım                                     */
/* ------------------------------------------------------------------ */

export const generators = pgTable(
  "jeneratorler",
  {
    id: serial("id").primaryKey(),
    extra: jsonb("ek_alanlar").$type<Record<string, string | number | null>>().notNull().default({}),
    customerId: integer("musteri_id").references(() => customers.id, { onDelete: "set null" }),
    brand: text("marka"),
    model: text("model"),
    serialNo: text("seri_no"),
    kva: numeric("kva", { precision: 10, scale: 2 }),
    kw: numeric("kw", { precision: 10, scale: 2 }),
    volt: text("volt"),
    phase: text("faz"),
    frequency: text("frekans"),
    runningHours: numeric("calisma_saati", { precision: 10, scale: 1 }),
    engineInfo: text("motor_bilgileri"),
    alternatorInfo: text("alternator_bilgileri"),
    notes: text("notlar"),
    /** Periyodik bakım aralığı */
    maintenanceEveryHours: integer("bakim_aralik_saat"),
    maintenanceEveryDays: integer("bakim_aralik_gun"),
    lastMaintenanceAt: date("son_bakim_tarihi"),
    lastMaintenanceHours: numeric("son_bakim_saati", { precision: 10, scale: 1 }),
    createdAt: timestamp("olusturma_tarihi", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ serialIdx: index("jenerator_seri_idx").on(t.serialNo) }),
);

export const generatorServiceLogs = pgTable(
  "jenerator_servis_kayitlari",
  {
    id: serial("id").primaryKey(),
    generatorId: integer("jenerator_id")
      .notNull()
      .references(() => generators.id, { onDelete: "cascade" }),
    workOrderId: integer("is_emri_id").references(() => workOrders.id, { onDelete: "set null" }),
    serviceDate: date("tarih").notNull(),
    kind: text("tur").notNull().default("bakim"), // bakim | ariza
    fault: text("ariza"),
    workDone: text("yapilan_islemler"),
    replacedParts: text("degisen_parcalar"),
    testResults: text("test_sonuclari"),
    runningHours: numeric("calisma_saati", { precision: 10, scale: 1 }),
    cost: numeric("maliyet", { precision: 12, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("olusturma_tarihi", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ genIdx: index("jen_servis_gen_idx").on(t.generatorId) }),
);

/* ------------------------------------------------------------------ */
/* Pompalar                                                            */
/* ------------------------------------------------------------------ */

export const pumpRepairs = pgTable(
  "pompa_tamirleri",
  {
    id: serial("id").primaryKey(),
    extra: jsonb("ek_alanlar").$type<Record<string, string | number | null>>().notNull().default({}),
    workOrderId: integer("is_emri_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    brand: text("marka"),
    model: text("model"),
    power: text("guc"),
    voltage: text("voltaj"),
    flowRate: text("debi"),
    head: text("basma_yuksekligi"),
    fault: text("ariza"),
    windingInfo: text("sargi_bilgileri"),
    bearing: text("rulman"),
    mechanicalSeal: text("mekanik_salmastra"),
    workDone: text("yapilan_islemler"),
    cost: numeric("maliyet", { precision: 12, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("olusturma_tarihi", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ woIdx: index("pompa_wo_idx").on(t.workOrderId) }),
);

/* ------------------------------------------------------------------ */
/* Stok ve depo                                                        */
/* ------------------------------------------------------------------ */

export const stockItems = pgTable(
  "stok_urunleri",
  {
    id: serial("id").primaryKey(),
    name: text("ad").notNull(),
    category: stockCategoryEnum("kategori").notNull().default("diger"),
    /** Emaye bakır tel için çap (mm): 0.80, 0.90, 1.00 ... */
    wireDiameter: numeric("tel_capi_mm", { precision: 6, scale: 3 }),
    unit: text("birim").notNull().default("adet"), // adet, kg, metre
    buyPrice: numeric("alis_fiyati", { precision: 12, scale: 2 }).notNull().default("0"),
    sellPrice: numeric("satis_fiyati", { precision: 12, scale: 2 }).notNull().default("0"),
    quantity: numeric("mevcut_miktar", { precision: 12, scale: 3 }).notNull().default("0"),
    minQuantity: numeric("minimum_stok", { precision: 12, scale: 3 }).notNull().default("0"),
    supplierId: integer("tedarikci_id").references(() => suppliers.id, { onDelete: "set null" }),
    active: boolean("aktif").notNull().default(true),
    createdAt: timestamp("olusturma_tarihi", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ categoryIdx: index("stok_kategori_idx").on(t.category) }),
);

export const stockMovements = pgTable(
  "stok_hareketleri",
  {
    id: serial("id").primaryKey(),
    stockItemId: integer("stok_id")
      .notNull()
      .references(() => stockItems.id, { onDelete: "cascade" }),
    type: stockMovementTypeEnum("tur").notNull(),
    /** Giriş için pozitif, çıkış için negatif miktar saklanır. */
    quantity: numeric("miktar", { precision: 12, scale: 3 }).notNull(),
    unitPrice: numeric("birim_fiyat", { precision: 12, scale: 2 }),
    workOrderId: integer("is_emri_id").references(() => workOrders.id, { onDelete: "set null" }),
    note: text("not"),
    userId: integer("kullanici_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("tarih", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ itemIdx: index("stok_hareket_stok_idx").on(t.stockItemId) }),
);

/* ------------------------------------------------------------------ */
/* Finans                                                              */
/* ------------------------------------------------------------------ */

export const payments = pgTable(
  "tahsilatlar",
  {
    id: serial("id").primaryKey(),
    customerId: integer("musteri_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    workOrderId: integer("is_emri_id").references(() => workOrders.id, { onDelete: "set null" }),
    amount: numeric("tutar", { precision: 12, scale: 2 }).notNull(),
    method: paymentMethodEnum("yontem").notNull().default("nakit"),
    paidAt: timestamp("odeme_tarihi", { withTimezone: true }).notNull().defaultNow(),
    note: text("not"),
    userId: integer("kullanici_id").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => ({
    customerIdx: index("tahsilat_musteri_idx").on(t.customerId),
    woIdx: index("tahsilat_wo_idx").on(t.workOrderId),
    dateIdx: index("tahsilat_tarih_idx").on(t.paidAt),
  }),
);

export const expenses = pgTable(
  "giderler",
  {
    id: serial("id").primaryKey(),
    category: text("kategori").notNull(), // malzeme alışı, kira, elektrik, maaş...
    description: text("aciklama"),
    amount: numeric("tutar", { precision: 12, scale: 2 }).notNull(),
    method: paymentMethodEnum("yontem").notNull().default("nakit"),
    supplierId: integer("tedarikci_id").references(() => suppliers.id, { onDelete: "set null" }),
    spentAt: timestamp("gider_tarihi", { withTimezone: true }).notNull().defaultNow(),
    userId: integer("kullanici_id").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => ({ dateIdx: index("gider_tarih_idx").on(t.spentAt) }),
);

/* ------------------------------------------------------------------ */
/* Fotoğraflar                                                         */
/* ------------------------------------------------------------------ */

export const photos = pgTable(
  "fotograflar",
  {
    id: serial("id").primaryKey(),
    url: text("url").notNull(),
    kind: photoKindEnum("tur").notNull().default("genel"),
    caption: text("aciklama"),
    workOrderId: integer("is_emri_id").references(() => workOrders.id, { onDelete: "cascade" }),
    windingRecordId: integer("bobinaj_id").references(() => windingRecords.id, { onDelete: "cascade" }),
    uploadedBy: integer("yukleyen_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("tarih", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    woIdx: index("foto_wo_idx").on(t.workOrderId),
    windingIdx: index("foto_bobinaj_idx").on(t.windingRecordId),
  }),
);
