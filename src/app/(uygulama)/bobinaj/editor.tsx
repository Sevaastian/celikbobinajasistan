"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BobinajEditor({ initialData, action }: { initialData?: any; action: (data: any) => Promise<any> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [marka, setMarka] = useState(initialData?.marka || "");
  const [model, setModel] = useState(initialData?.model || "");
  const [gucKw, setGucKw] = useState(initialData?.guc_kw ? String(initialData.guc_kw) : "");
  const [devir, setDevir] = useState(initialData?.devir ? String(initialData.devir) : "");
  
  // Eski kayıtlardan null gelebilecek dizi alanını güvenli karşılıyoruz (Sayfanın çökmesini önler)
  const [ekTelCaplari] = useState<string[]>(
    Array.isArray(initialData?.ek_tel_caplari_mm)
      ? initialData.ek_tel_caplari_mm.map(String)
      : []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await action({
        marka,
        model,
        guc_kw: gucKw ? Number(gucKw) : null,
        devir: devir ? Number(devir) : null,
        ek_tel_caplari_mm: ekTelCaplari,
      });
      router.refresh();
      router.push("/bobinaj");
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl bg-white p-6 rounded-lg shadow border">
      {error && <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
        <input
          type="text"
          required
          value={marka}
          onChange={(e) => setMarka(e.target.value)}
          placeholder="Örn: Siemens"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Model / Tip</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="Model bilgisi"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Güç (kW)</label>
          <input
            type="number"
            step="any"
            value={gucKw}
            onChange={(e) => setGucKw(e.target.value)}
            placeholder="0.0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Devir (RPM)</label>
          <input
            type="number"
            value={devir}
            onChange={(e) => setDevir(e.target.value)}
            placeholder="1500"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? "Kaydediliyor..." : "Kaydı Güncelle"}
      </button>
    </form>
  );
}

