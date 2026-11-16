"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Form doğrulama şeması (Dizi alanlarının güvenli array olarak gelmesini garantiliyoruz)
const formSchema = z.object({
  marka: z.string().min(1, "Marka zorunludur"),
  model: z.string().optional().nullable(),
  guc_kw: z.string().optional().nullable(),
  devir: z.string().optional().nullable(),
  ek_tel_caplari_mm: z.array(z.string()).default([]),
});

export function BobinajEditor({ initialData, action }: { initialData?: any; action: (data: any) => Promise<any> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Eski kayıtlardan null gelebilecek alanları güvenli varsayılanlarla karşılıyoruz
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      marka: initialData?.marka || "",
      model: initialData?.model || "",
      guc_kw: initialData?.guc_kw ? String(initialData.guc_kw) : "",
      devir: initialData?.devir ? String(initialData.devir) : "",
      // Hatanın koptuğu yer: null gelebilecek dizi alanını garantiye alıyoruz
      ek_tel_caplari_mm: Array.isArray(initialData?.ek_tel_caplari_mm)
        ? initialData.ek_tel_caplari_mm.map(String)
        : [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError(null);
    try {
      await action(values);
      router.refresh();
      router.push("/bobinaj");
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        {error && <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">{error}</div>}

        <FormField
          control={form.control}
          name="marka"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marka</FormLabel>
              <FormControl>
                <Input placeholder="Örn: Siemens" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model / Tip</FormLabel>
              <FormControl>
                <Input placeholder="Model bilgisi" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="guc_kw"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Güç (kW)</FormLabel>
                <FormControl>
                  <Input type="number" step="any" placeholder="0.0" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="devir"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Devir (RPM)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="1500" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Kaydediliyor..." : "Kaydı Güncelle"}
        </Button>
      </form>
    </Form>
  );
}
