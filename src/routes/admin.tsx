import { createFileRoute, Link } from "@tanstack/react-router";
import jsPDF from "jspdf";
import { ArrowRight, Check, FileDown, ImageDown, Loader2, ShieldAlert, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import logo from "@/assets/logo.png";
import { Particles } from "@/components/Particles";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { resolveDevice } from "@/lib/device";

type Status = "pending" | "approved" | "rejected";

type Submission = {
  id: string;
  player_id: string;
  status: string;
  created_at: string;
  promo_image_url: string;
  account_image_url: string;
  promoSigned?: string;
  accountSigned?: string;
};

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الأدمن — KAJO ARENA" },
      { name: "description", content: "مراجعة طلبات الاشتراك في المسابقة وقبولها أو رفضها." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "لوحة الأدمن — KAJO ARENA" },
      { property: "og:description", content: "مراجعة طلبات الاشتراك في المسابقة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const info = await resolveDevice();
      setDeviceId(info.deviceId);
      setIsAdmin(info.isAdmin);
    })();
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("submissions")
      .select("id, player_id, status, created_at, promo_image_url, account_image_url")
      .order("created_at", { ascending: false });
    const list = data ?? [];
    const signed = await Promise.all(
      list.map(async (row) => {
        const [a, b] = await Promise.all([
          supabase.storage.from("proofs").createSignedUrl(row.promo_image_url, 3600),
          supabase.storage.from("proofs").createSignedUrl(row.account_image_url, 3600),
        ]);
        return {
          ...row,
          promoSigned: a.data?.signedUrl,
          accountSigned: b.data?.signedUrl,
        } as Submission;
      }),
    );
    setRows(signed);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const review = async (id: string, status: Status) => {
    await supabase.from("submissions").update({ status }).eq("id", id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const approvedIds = rows.filter((r) => r.status === "approved").map((r) => r.player_id);

  const [exportMsg, setExportMsg] = useState<string | null>(null);

  /** Downloads a blob; falls back to opening a new tab when downloads are blocked (iframe/mobile). */
  const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExportMsg(`تم تصدير ${filename}`);
    } catch {
      window.open(url, "_blank", "noopener");
      setExportMsg("تم فتح الملف في تبويب جديد");
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const exportPdf = () => {
    if (!approvedIds.length) {
      setExportMsg("لا توجد ايديهات مقبولة للتصدير.");
      return;
    }
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const drawFrame = () => {
      doc.setFillColor(10, 10, 12);
      doc.rect(0, 0, W, H, "F");
      doc.setDrawColor(214, 174, 92);
      doc.setLineWidth(1.2);
      doc.rect(22, 22, W - 44, H - 44);
      doc.setLineWidth(0.4);
      doc.rect(29, 29, W - 58, H - 58);
    };

    let page = 1;
    drawFrame();
    doc.setTextColor(240, 194, 90);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("KAJO ARENA", W / 2, 78, { align: "center" });
    doc.setFontSize(13);
    doc.setTextColor(190, 190, 190);
    doc.setFont("helvetica", "normal");
    doc.text("Approved Player IDs", W / 2, 100, { align: "center" });
    doc.setDrawColor(214, 174, 92);
    doc.setLineWidth(0.8);
    doc.line(W / 2 - 90, 112, W / 2 + 90, 112);
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `${new Date().toLocaleDateString("en-GB")}  •  Total: ${approvedIds.length}`,
      W / 2,
      130,
      { align: "center" },
    );

    let y = 164;
    approvedIds.forEach((id, i) => {
      if (y > H - 70) {
        doc.addPage();
        page += 1;
        drawFrame();
        y = 70;
      }
      doc.setFillColor(i % 2 === 0 ? 22 : 16, i % 2 === 0 ? 22 : 16, i % 2 === 0 ? 26 : 20);
      doc.rect(48, y - 15, W - 96, 26, "F");
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(String(i + 1).padStart(2, "0"), 62, y + 2);
      doc.setTextColor(240, 205, 120);
      doc.setFont("courier", "bold");
      doc.setFontSize(13);
      doc.text(id, W - 62, y + 2, { align: "right" });
      y += 30;
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${page}`, W / 2, H - 34, { align: "center" });

    saveBlob(doc.output("blob"), "approved-ids.pdf");
  };

  const exportImage = () => {
    if (!approvedIds.length) {
      setExportMsg("لا توجد ايديهات مقبولة للتصدير.");
      return;
    }
    const scale = 2;
    const width = 760;
    const rowH = 54;
    const top = 210;
    const height = top + approvedIds.length * rowH + 90;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);

    // background
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#0a0a0c");
    bg.addColorStop(0.5, "#121014");
    bg.addColorStop(1, "#08080a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // gold glow
    const glow = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, 420);
    glow.addColorStop(0, "rgba(240,194,90,0.20)");
    glow.addColorStop(1, "rgba(240,194,90,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, 420);

    // frames
    const gold = ctx.createLinearGradient(0, 0, width, 0);
    gold.addColorStop(0, "#8a6b28");
    gold.addColorStop(0.5, "#f4d488");
    gold.addColorStop(1, "#8a6b28");
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);
    ctx.lineWidth = 0.7;
    ctx.strokeRect(29, 29, width - 58, height - 58);

    // header
    ctx.textAlign = "center";
    ctx.fillStyle = gold;
    ctx.font = "bold 40px Georgia, serif";
    ctx.fillText("KAJO ARENA", width / 2, 100);
    ctx.fillStyle = "#cfcfcf";
    ctx.font = "18px Georgia, serif";
    ctx.fillText("APPROVED PLAYER IDS", width / 2, 132);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 110, 150);
    ctx.lineTo(width / 2 + 110, 150);
    ctx.stroke();
    ctx.fillStyle = "#8f8f8f";
    ctx.font = "14px sans-serif";
    ctx.fillText(
      `${new Date().toLocaleDateString("en-GB")}   •   Total: ${approvedIds.length}`,
      width / 2,
      176,
    );

    // rows
    approvedIds.forEach((id, i) => {
      const y = top + i * rowH;
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.015)";
      roundRect(ctx, 52, y, width - 104, rowH - 12, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(240,194,90,0.18)";
      ctx.lineWidth = 1;
      roundRect(ctx, 52, y, width - 104, rowH - 12, 12);
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = "#8a8a8a";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(String(i + 1).padStart(2, "0"), 74, y + 28);

      ctx.textAlign = "right";
      ctx.fillStyle = "#f2d391";
      ctx.font = "bold 22px 'Courier New', monospace";
      ctx.fillText(id, width - 74, y + 29);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(240,194,90,0.55)";
    ctx.font = "13px sans-serif";
    ctx.fillText("KAJO ARENA  •  Contest Winners List", width / 2, height - 50);

    canvas.toBlob((blob) => {
      if (blob) saveBlob(blob, "approved-ids.png");
      else setExportMsg("تعذر إنشاء الصورة، جرّب تصدير PDF.");
    }, "image/png");
  };

  if (deviceId === null || isAdmin === null) return null;

  if (!isAdmin) {
    return (
      <div
        dir="rtl"
        className="relative flex min-h-screen items-center justify-center bg-background px-4"
      >
        <Particles />
        <div className="glass relative z-10 max-w-sm rounded-2xl p-8 text-center">
          <ShieldAlert className="mx-auto size-10 text-destructive" />
          <h1 className="gold-text mt-4 text-xl font-black">غير مصرح لك</h1>
          <p className="mt-2 text-sm text-muted-foreground">هذه الصفحة متاحة لأجهزة الإدارة فقط.</p>
          <Button className="mt-6 w-full font-bold" asChild>
            <Link to="/terms">العودة للشروط</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden bg-background pb-20">
      <Particles />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-96 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_70%)]" />

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <span className="gold-text text-lg font-black tracking-wide">لوحة الأدمن</span>
          <Button size="sm" variant="outline" asChild>
            <Link to="/terms">
              <ArrowRight className="size-4" />
              الشروط
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4">
        <section className="flex flex-col items-center pt-8">
          <div className="glass rounded-full p-4">
            <img
              src={logo}
              alt="شعار المسابقة"
              width={1024}
              height={1024}
              loading="lazy"
              className="w-20 drop-shadow-[0_0_28px_rgba(255,196,80,0.35)]"
            />
          </div>
          <div className="mt-3 h-px w-40 bg-gradient-to-l from-transparent via-primary to-transparent" />
        </section>

        <Tabs defaultValue="pending" className="mt-8">
          <TabsList className="glass grid w-full grid-cols-4 rounded-xl p-1">
            <TabsTrigger value="pending">المعلقة</TabsTrigger>
            <TabsTrigger value="approved">المقبولة</TabsTrigger>
            <TabsTrigger value="rejected">المرفوضة</TabsTrigger>
            <TabsTrigger value="ids">الايديهات</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="glass mt-6 flex items-center justify-center gap-2 rounded-2xl p-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              جاري التحميل...
            </div>
          ) : (
            <>
              {(["pending", "approved", "rejected"] as Status[]).map((s) => (
                <TabsContent key={s} value={s} className="mt-6 space-y-5">
                  {rows.filter((r) => r.status === s).length === 0 && (
                    <p className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
                      لا يوجد طلبات هنا.
                    </p>
                  )}
                  {rows
                    .filter((r) => r.status === s)
                    .map((row) => (
                      <article key={row.id} className="glass rounded-2xl p-5">
                        <div className="mb-4 flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(row.created_at).toLocaleString("ar-EG")}
                          </span>
                          <span
                            dir="ltr"
                            className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-base font-black tracking-widest text-primary"
                          >
                            {row.player_id}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ProofThumb
                            label="صورة البروموكود"
                            src={row.promoSigned}
                            onOpen={setPreview}
                          />
                          <ProofThumb
                            label="صورة الحساب"
                            src={row.accountSigned}
                            onOpen={setPreview}
                          />
                        </div>
                        {s === "pending" && (
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <Button
                              className="font-bold"
                              onClick={() => void review(row.id, "approved")}
                            >
                              <Check className="size-4" />
                              موافقة
                            </Button>
                            <Button
                              variant="destructive"
                              className="font-bold"
                              onClick={() => void review(row.id, "rejected")}
                            >
                              <X className="size-4" />
                              رفض
                            </Button>
                          </div>
                        )}
                      </article>
                    ))}
                </TabsContent>
              ))}

              <TabsContent value="ids" className="mt-6">
                <section className="glass rounded-2xl p-5">
                  <h2 className="gold-text mb-4 text-lg font-black">
                    الايديهات المقبولة ({approvedIds.length})
                  </h2>
                  <div className="space-y-2">
                    {approvedIds.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground">
                        لا يوجد ايديهات مقبولة بعد.
                      </p>
                    )}
                    {approvedIds.map((id, i) => (
                      <div
                        key={id + i}
                        dir="ltr"
                        className="flex items-center justify-between rounded-xl border border-border bg-background/30 px-4 py-2.5 font-mono text-sm font-bold text-foreground"
                      >
                        <span className="text-muted-foreground">{i + 1}</span>
                        <span className="tracking-widest text-primary">{id}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Button
                      className="font-bold"
                      onClick={exportPdf}
                      disabled={approvedIds.length === 0}
                    >
                      <FileDown className="size-4" />
                      تصدير PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="font-bold"
                      onClick={exportImage}
                      disabled={approvedIds.length === 0}
                    >
                      <ImageDown className="size-4" />
                      تصدير صورة
                    </Button>
                  </div>
                  {exportMsg && (
                    <p className="mt-3 text-center text-sm font-bold text-primary">{exportMsg}</p>
                  )}
                </section>
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="إغلاق المعاينة"
            onClick={() => setPreview(null)}
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full border border-primary/40 bg-background/70 text-primary"
          >
            <X className="size-6" />
          </button>
          <img
            src={preview}
            alt="معاينة الصورة"
            className="max-h-[85vh] max-w-full rounded-2xl border border-primary/30 object-contain"
          />
        </div>
      )}
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ProofThumb({
  label,
  src,
  onOpen,
}: {
  label: string;
  src?: string | undefined;
  onOpen: (src: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">{label}</p>
      <button
        type="button"
        onClick={() => src && onOpen(src)}
        className="aspect-square w-full overflow-hidden rounded-xl border border-border bg-background/30"
      >
        {src ? (
          <img src={src} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-muted-foreground">لا توجد صورة</span>
        )}
      </button>
    </div>
  );
}
