import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Check, Copy, Download, Hash, ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import logo from "@/assets/logo.png";
import stepDownload from "@/assets/step-download.jpg";
import stepPromo from "@/assets/step-promo.jpg";
import stepUpload from "@/assets/step-upload.jpg";
import { Particles } from "@/components/Particles";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { checkAdminId } from "@/lib/admin.functions";
import { grantAdminAccess, isValidPlayerId, resolveDevice } from "@/lib/device";

const PROMO_CODE = "KAJO117";
const PLATFORM_URL = "https://refpa79184.com/L?tag=d_5982434m_132250c_&site=5982434&ad=132250";

type SubmissionStatus = "pending" | "approved" | "rejected";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاشتراك في المسابقة — KAJO ARENA" },
      {
        name: "description",
        content:
          "شروط الانضمام: تحميل منصة Greenbet، التسجيل بالبرومو كود KAJO117، إدخال الـ ID ورفع صور التأكيد.",
      },
      { property: "og:title", content: "شروط الاشتراك في المسابقة" },
      {
        property: "og:description",
        content: "شروط الانضمام للمسابقة خطوة بخطوة مع رفع صور التأكيد.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const navigate = useNavigate();
  const [warnOpen, setWarnOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [usersOnline, setUsersOnline] = useState(0);

  const [deviceId, setDeviceId] = useState("");
  const [stableHardwareId, setStableHardwareId] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [deviceCandidates, setDeviceCandidates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubmissionStatus | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [promoFile, setPromoFile] = useState<File | null>(null);
  const [accountFile, setAccountFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUsersOnline(120 + Math.floor(Math.random() * 80));
    const id = window.setInterval(() => {
      setUsersOnline((v) => Math.max(80, v + Math.floor(Math.random() * 7) - 3));
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    void (async () => {
      const {
        deviceId: id,
        stableHardwareId: stableId,
        telegramId: telegram,
        candidates,
      } = await resolveDevice();
      setDeviceId(id);
      setStableHardwareId(stableId);
      setTelegramId(telegram);
      setDeviceCandidates(candidates);
      const identityFilters = [
        `hardware_id.eq.${id}`,
        `stable_hardware_id.eq.${stableId}`,
        `device_id.in.(${(candidates.length ? candidates : [id]).join(",")})`,
      ];
      if (telegram) identityFilters.push(`telegram_id.eq.${telegram}`);
      const { data } = await supabase
        .from("submissions")
        .select("status")
        .or(identityFilters.join(","))
        .limit(1);
      const first = data?.[0];
      if (first) setStatus(first.status as SubmissionStatus);
      setLoading(false);
    })();
  }, []);

  /** Typing the private admin ID opens the dashboard; the ID is verified server-side. */
  const tryAdmin = async (value: string) => {
    try {
      const { isAdmin } = await checkAdminId({ data: { id: value } });
      if (isAdmin) {
        grantAdminAccess();
        void navigate({ to: "/admin" });
      }
    } catch {
      /* ignore verification failures */
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (!isValidPlayerId(playerId)) {
      setError("الـ ID يجب أن يبدأ بـ 17 وطوله من 9 إلى 12 رقمًا.");
      return;
    }
    if (!promoFile || !accountFile) {
      setError("رفع صورة البروموكود وصورة الحساب إجباري.");
      return;
    }
    if (!deviceId || !stableHardwareId) {
      setError("تعذر التحقق من الجهاز، برجاء تحديث الصفحة والمحاولة مرة أخرى.");
      return;
    }
    setSubmitting(true);
    try {
      const existingIds = deviceCandidates.length ? deviceCandidates : [deviceId];
      const identityFilters = [
        `hardware_id.eq.${deviceId}`,
        `stable_hardware_id.eq.${stableHardwareId}`,
        `device_id.in.(${existingIds.join(",")})`,
      ];
      if (telegramId) identityFilters.push(`telegram_id.eq.${telegramId}`);
      const { data: existing } = await supabase
        .from("submissions")
        .select("status")
        .or(identityFilters.join(","))
        .limit(1);
      const previous = existing?.[0];
      if (previous) {
        setStatus(previous.status as SubmissionStatus);
        throw new Error("ALREADY_SUBMITTED");
      }

      const promoPath = `${deviceId}/promo`;
      const accountPath = `${deviceId}/account`;

      // Reserve all device/account identities atomically before storage accepts files.
      const { error: insErr } = await supabase.from("submissions").insert({
        device_id: deviceId,
        hardware_id: deviceId,
        stable_hardware_id: stableHardwareId,
        telegram_id: telegramId || null,
        player_id: playerId,
        promo_image_url: promoPath,
        account_image_url: accountPath,
      });
      if (insErr) throw insErr;

      const upload = async (file: File, kind: "promo" | "account") => {
        const path = `${deviceId}/${kind}`;
        const { error: upErr } = await supabase.storage.from("proofs").upload(path, file, {
          upsert: false,
          contentType: file.type || "image/jpeg",
        });
        if (upErr) throw upErr;
        return path;
      };
      await Promise.all([
        upload(promoFile, "promo"),
        upload(accountFile, "account"),
      ]);
      setStatus("pending");
    } catch (caught) {
      if (caught instanceof Error && caught.message === "ALREADY_SUBMITTED") return;
      const { data: existing } = await supabase
        .from("submissions")
        .select("status")
        .or(
          [
            `hardware_id.eq.${deviceId}`,
            `stable_hardware_id.eq.${stableHardwareId}`,
            ...(telegramId ? [`telegram_id.eq.${telegramId}`] : []),
          ].join(","),
        )
        .limit(1);
      const previous = existing?.[0];
      if (previous) {
        setStatus(previous.status as SubmissionStatus);
      } else {
        setError("هذا الجهاز رفع الصورتين من قبل، ولا يمكن رفع صور أخرى.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden bg-background pb-20">
      <Particles />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-96 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_70%)]" />

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-2 px-4">
          <span className="gold-text text-lg font-black tracking-wide">KAJO ARENA</span>
          <div className="flex items-center gap-2">
            <span className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Users online : {usersOnline}
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4">
        <section className="flex flex-col items-center pt-8">
          <div className="glass rounded-full p-4">
            <img
              src={logo}
              alt="شعار المسابقة"
              width={1024}
              height={1024}
              loading="lazy"
              className="w-24 drop-shadow-[0_0_28px_rgba(255,196,80,0.35)]"
            />
          </div>
          <h1 className="gold-text mt-4 text-3xl font-black">الشروط</h1>
          {deviceId && (
            <p
              dir="ltr"
              className="glass mt-3 max-w-full rounded-xl px-4 py-1.5 text-center text-[0.65rem] font-mono leading-relaxed tracking-wider text-muted-foreground break-all"
            >
              {deviceId}
            </p>
          )}
          <div className="mt-3 h-px w-40 bg-gradient-to-l from-transparent via-primary to-transparent" />
        </section>

        <div className="mt-8 space-y-6">
          <StepCard index={1} title="تحميل منصة Greenbet" image={stepDownload}>
            <Button
              className="w-full border border-border bg-white font-bold text-black hover:bg-white/90"
              asChild
            >
              <a href={PLATFORM_URL} target="_blank" rel="noopener noreferrer">
                <Download className="size-4" />
                تحميل
              </a>
            </Button>
          </StepCard>

          <StepCard index={2} title="التسجيل بالبروموكود الخاص بنا" image={stepPromo}>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl border border-dashed border-primary/60 bg-background/40 px-4 py-3 text-center text-lg font-black tracking-[0.25em] text-primary">
                {PROMO_CODE}
              </div>
              <Button variant="outline" onClick={copyCode} aria-label="نسخ البروموكود">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "تم النسخ" : "نسخ"}
              </Button>
            </div>
          </StepCard>

          {loading ? (
            <div className="glass flex items-center justify-center gap-2 rounded-2xl p-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              جاري التحقق من جهازك...
            </div>
          ) : status ? (
            <StatusCard status={status} />
          ) : (
            <>
              <StepCard index={3} title="إدخال الـ ID الخاص بك" image={stepPromo}>
                <p className="mb-3 text-sm font-black text-destructive">إجباري</p>
                <div className="flex items-center gap-2">
                  <Hash className="size-5 shrink-0 text-primary" />
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="17XXXXXXXXX"
                    value={playerId}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                      setPlayerId(value);
                      if (value.length >= 9) void tryAdmin(value);
                    }}
                    className="text-center text-lg font-black tracking-widest"
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  يبدأ بـ 17 ويكون طوله من 9 إلى 12 رقمًا.
                </p>
              </StepCard>

              <StepCard index={4} title="رفع صور التأكيد" image={stepUpload}>
                <p className="mb-3 text-sm font-black text-destructive">إجباري</p>
                <div className="grid grid-cols-2 gap-3">
                  <UploadBox label="رفع صورة البروموكود" onPick={setPromoFile} />
                  <UploadBox label="رفع صورة الحساب" onPick={setAccountFile} />
                </div>
                {error && (
                  <p className="mt-3 text-center text-sm font-bold text-destructive">{error}</p>
                )}
                <Button className="mt-4 w-full font-bold" onClick={submit} disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  تأكيد
                </Button>
              </StepCard>
            </>
          )}
        </div>
      </main>

      <Dialog open={warnOpen} onOpenChange={setWarnOpen}>
        <DialogContent
          dir="rtl"
          className="overflow-hidden border-primary/30 bg-popover/70 p-0 text-right shadow-[0_30px_80px_-20px_color-mix(in_oklab,var(--primary)_45%,transparent)] backdrop-blur-2xl sm:max-w-md"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_72%)]" />
          <div className="h-px w-full bg-gradient-to-l from-transparent via-primary to-transparent" />

          <div className="relative px-7 pb-7 pt-8">
            <DialogHeader>
              <div className="relative mx-auto mb-4 flex size-16 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <span className="absolute inset-0 rounded-full border border-primary/40" />
                <span className="flex size-12 items-center justify-center rounded-full bg-gradient-to-b from-primary/25 to-transparent text-primary">
                  <AlertTriangle className="size-7" />
                </span>
              </div>
              <DialogTitle className="gold-text text-center text-2xl font-black tracking-wide">
                تحذير هام
              </DialogTitle>
              <div className="mx-auto mt-2 h-px w-24 bg-gradient-to-l from-transparent via-primary/70 to-transparent" />
              <DialogDescription className="mt-3 text-center text-[0.95rem] leading-8 text-muted-foreground">
                الاشتراك يكون <span className="font-bold text-primary">مرة واحدة فقط</span> في
                المسابقة لكل هاتف، برجاء الالتزام بالشروط للانضمام الصحيح للمسابقة وعدم حدوث أي
                مشاكل في تسجيلك.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6">
              <Button
                size="lg"
                className="w-full rounded-xl font-black tracking-wide shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
                onClick={() => setWarnOpen(false)}
              >
                فهمت، متابعة
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusCard({ status }: { status: SubmissionStatus }) {
  const content = {
    pending: {
      icon: <Loader2 className="size-7 animate-spin" />,
      title: "طلبك تحت المراجعة",
      text: "تم استلام بياناتك وصورك بنجاح، سيتم مراجعة الطلب من الإدارة قريبًا.",
    },
    approved: {
      icon: <Check className="size-7" />,
      title: "تم المشاركة في المسابقة بنجاح",
      text: "مبروك! تم تأكيد اشتراكك في المسابقة. بالتوفيق.",
    },
    rejected: {
      icon: <X className="size-7" />,
      title: "تم رفض طلبك",
      text: "برجاء التأكد من الالتزام بالشروط والتواصل مع الإدارة.",
    },
  }[status];

  return (
    <section className="glass rounded-2xl p-8 text-center">
      <div className="relative mx-auto mb-4 flex size-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-primary/40" />
        <span className="flex size-12 items-center justify-center rounded-full bg-gradient-to-b from-primary/25 to-transparent text-primary">
          {content.icon}
        </span>
      </div>
      <h2 className="gold-text text-xl font-black">{content.title}</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{content.text}</p>
      <p className="mt-4 text-xs text-muted-foreground">الاشتراك مسموح مرة واحدة فقط لكل جهاز.</p>
    </section>
  );
}

function StepCard({
  index,
  title,
  image,
  children,
}: {
  index: number;
  title: string;
  image: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-sm font-black text-primary">
          {index}
        </span>
        <img
          src={image}
          alt={title}
          width={768}
          height={768}
          loading="lazy"
          className="size-14 shrink-0 rounded-xl border border-border object-cover"
        />
        <h2 className="text-base font-bold text-card-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function UploadBox({ label, onPick }: { label: string; onPick: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div>
      <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex aspect-square w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border bg-background/30 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        {preview ? (
          <img src={preview} alt={label} className="h-full w-full object-cover" />
        ) : (
          <>
            <ImagePlus className="size-6" />
            <span className="text-xs">اختر صورة</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setPreview(URL.createObjectURL(file));
            onPick(file);
          }
        }}
      />
    </div>
  );
}
