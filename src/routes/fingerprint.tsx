import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Cpu, Fingerprint, Loader2, Monitor, RefreshCw, Waves } from "lucide-react";
import { useEffect, useState } from "react";

import { Particles } from "@/components/Particles";
import { Button } from "@/components/ui/button";
import { getDeviceId } from "@/lib/device";
import { getHardwareFingerprint, type HardwareTraits } from "@/lib/hardware-fingerprint";

export const Route = createFileRoute("/fingerprint")({
  head: () => ({
    meta: [
      { title: "بصمة الجهاز — KAJO ARENA" },
      {
        name: "description",
        content:
          "لوحة بصمة الجهاز: معرف ثابت مبني على كرت الرسوميات، الكانفس، الصوت ومواصفات العتاد، لا يتغير بتغيير المتصفح أو الشبكة.",
      },
      { property: "og:title", content: "بصمة الجهاز — KAJO ARENA" },
      {
        property: "og:description",
        content: "معرف جهاز ثابت مبني على العتاد لا يتأثر بتغيير المتصفح أو الـ VPN.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FingerprintPage,
});

function FingerprintPage() {
  const [id, setId] = useState("");
  const [visitorId, setVisitorId] = useState("");
  const [traits, setTraits] = useState<HardwareTraits | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stability, setStability] = useState<null | "testing" | "stable" | "changed">(null);

  useEffect(() => {
    void (async () => {
      const [hw, vid] = await Promise.all([getHardwareFingerprint(), getDeviceId()]);
      setId(hw.id);
      setTraits(hw.traits);
      setVisitorId(vid);
      setLoading(false);
    })();
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const testStability = async () => {
    setStability("testing");
    // Re-collect every signal from scratch (simulates a new session / new network).
    const again = await getHardwareFingerprint(true);
    setStability(again.id === id ? "stable" : "changed");
  };

  const rows: [string, React.ReactNode, string][] = traits
    ? [
        ["GPU Vendor", <Monitor className="size-4" key="a" />, traits.gpuVendor],
        ["GPU Renderer", <Monitor className="size-4" key="b" />, traits.gpuRenderer],
        ["CPU Cores", <Cpu className="size-4" key="c" />, String(traits.cpuCores)],
        ["Device Memory", <Cpu className="size-4" key="d" />, traits.deviceMemory],
        [
          "Screen",
          <Monitor className="size-4" key="e" />,
          `${traits.screen} · ${traits.colorDepth}/${traits.pixelDepth}-bit · dpr ${traits.devicePixelRatio}`,
        ],
        ["Timezone", <Waves className="size-4" key="f" />, traits.timezone],
        ["Languages", <Waves className="size-4" key="g" />, traits.languages || "—"],
        ["System Fonts", <Fingerprint className="size-4" key="h" />, traits.fonts || "—"],
        ["Browser visitorId", <Fingerprint className="size-4" key="i" />, visitorId || "—"],
      ]
    : [];


  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden bg-background pb-20">
      <Particles />
      <main className="relative z-10 mx-auto max-w-3xl px-4 pt-10">
        <h1 className="gold-text text-center text-3xl font-black">بصمة الجهاز</h1>

        <section className="glass mt-6 rounded-2xl p-6 text-center">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              جاري تحليل عتاد الجهاز...
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Device Fingerprint ID</p>
              <p dir="ltr" className="mt-2 break-all font-mono text-sm font-bold text-primary">
                {id}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="outline" onClick={copy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "تم النسخ" : "نسخ"}
                </Button>
                <Button onClick={testStability} disabled={stability === "testing"}>
                  {stability === "testing" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  اختبار الثبات
                </Button>
              </div>
              {stability === "stable" && (
                <p className="mt-3 text-sm font-bold text-primary">
                  البصمة ثابتة — لم تتغير بعد إعادة التحليل.
                </p>
              )}
              {stability === "changed" && (
                <p className="mt-3 text-sm font-bold text-destructive">
                  تم رصد اختلاف في إشارات العتاد.
                </p>
              )}
            </>
          )}
        </section>

        <section className="glass mt-6 rounded-2xl p-6">
          <h2 className="gold-text text-lg font-black">ليه البصمة ثابتة؟</h2>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
            <li>• البصمة محسوبة من العتاد فقط: كرت الرسوميات، المعالج، الرام، الشاشة، والخطوط.</li>
            <li>
              • مستبعد تمامًا: الـ User Agent، اسم المتصفح، رسم الـ Canvas، الصوت، وأي بيانات شبكة
              أو IP.
            </li>
            <li>• عشان كده الـ ID زي ما هو في Chrome و Firefox و Safari و Edge وفي وضع التصفح الخاص.</li>
            <li>• تشغيل VPN أو تغيير الشبكة لا يؤثر لأن الشبكة مش داخلة في الهاش أصلًا.</li>
          </ul>
        </section>



        {traits && (
          <section className="glass mt-6 overflow-hidden rounded-2xl">
            <table className="w-full text-right text-sm">
              <tbody>
                {rows.map(([label, icon, value]) => (
                  <tr key={label} className="border-b border-border/50 last:border-0">
                    <td className="w-44 px-4 py-3 font-semibold text-card-foreground">
                      <span className="flex items-center gap-2">
                        <span className="text-primary">{icon}</span>
                        {label}
                      </span>
                    </td>
                    <td dir="ltr" className="break-all px-4 py-3 font-mono text-xs text-muted-foreground">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}
