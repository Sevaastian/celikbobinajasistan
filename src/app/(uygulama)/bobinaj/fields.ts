export const motorFields = [
  ["brand", "Marka", "text"], ["model", "Model", "text"], ["serialNo", "Seri numarası", "text"],
  ["kw", "kW", "power"], ["hp", "HP", "power"], ["volt", "Volt", "text"],
  ["phase", "Faz", "text"], ["rpm", "RPM", "integer"], ["frequency", "Frekans", "text"],
  ["poleCount", "Kutup sayısı", "integer"], ["slotCount", "Oluk sayısı", "integer"],
  ["connectionType", "Bağlantı tipi", "text"], ["frameSize", "Gövde ölçüsü", "text"],
] as const;

export const windingFields = [
  ["hvc", "HVC", "text"], ["sipir", "Sipir", "text"], ["hatve", "Hatve", "text"],
 
  ["parallelWires", "Paralel tel sayısı", "integer"], ["coilCount", "Bobin sayısı", "integer"],
  ["slotInfo", "Oluk bilgileri", "multiline"], ["windingConnection", "Sarım bağlantısı", "text"],
  ["windingShape", "Sarım şekli", "text"], ["insulation", "İzolasyon bilgileri", "multiline"],
  ["notes", "Teknik açıklamalar", "multiline"],
] as const;
