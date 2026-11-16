export const serviceFields = {
  el_aleti: [
    ["toolType", "Alet türü"], ["brand", "Marka"], ["model", "Model"], ["serialNo", "Seri numarası"],
    ["watt", "Watt", "integer"], ["volt", "Volt"], ["fault", "Arıza", "long"], ["diagnosis", "Tespit", "long"],
    ["replacedParts", "Değiştirilen parçalar", "long"], ["labor", "İşçilik (₺)", "money"], ["materialCost", "Malzeme maliyeti (₺)", "money"],
  ],
  pompa: [
    ["brand", "Marka"], ["model", "Model"], ["power", "Güç"], ["voltage", "Voltaj"], ["flowRate", "Debi"],
    ["head", "Basma yüksekliği"], ["fault", "Arıza", "long"], ["windingInfo", "Sargı bilgileri", "long"],
    ["bearing", "Rulman"], ["mechanicalSeal", "Mekanik salmastra"], ["workDone", "Yapılan işlemler", "long"], ["cost", "Maliyet (₺)", "money"],
  ],
  jenerator: [
    ["brand", "Marka"], ["model", "Model"], ["serialNo", "Seri numarası"], ["kva", "kVA", "power"], ["kw", "kW", "power"],
    ["volt", "Volt"], ["phase", "Faz"], ["frequency", "Frekans"], ["runningHours", "Çalışma saati", "hours"],
    ["engineInfo", "Motor bilgileri", "long"], ["alternatorInfo", "Alternatör bilgileri", "long"],
    ["maintenanceEveryHours", "Bakım aralığı (saat)", "integer"], ["maintenanceEveryDays", "Bakım aralığı (gün)", "integer"],
    ["notes", "Notlar", "long"],
  ],
  service: [
    ["serviceDate", "Servis tarihi", "date"], ["fault", "Arıza", "long"], ["workDone", "Yapılan işlemler", "long"],
    ["replacedParts", "Değişen parçalar", "long"], ["testResults", "Test sonuçları", "long"],
    ["runningHours", "Çalışma saati", "hours"], ["cost", "Maliyet (₺)", "money"],
  ],
} as const;

export const servicePaths = { el_aleti: "/el-aletleri", pompa: "/pompalar", jenerator: "/jeneratorler" } as const;
export type ServiceKind = keyof typeof serviceFields;

export function maintenanceDue(generator: {
  lastMaintenanceAt: string | null; maintenanceEveryDays: number | null;
  lastMaintenanceHours: string | null; maintenanceEveryHours: number | null;
}) {
  const date = generator.lastMaintenanceAt && generator.maintenanceEveryDays
    ? new Date(new Date(generator.lastMaintenanceAt).valueOf() + generator.maintenanceEveryDays * 86400000) : null;
  const hours = generator.lastMaintenanceHours !== null && generator.maintenanceEveryHours
    ? Number(generator.lastMaintenanceHours) + generator.maintenanceEveryHours : null;
  return { date, hours };
}
