import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import logo from "@/assets/logo.png";
import { Particles } from "@/components/Particles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "المشاركة في المسابقة — KAJO ARENA" },
      {
        name: "description",
        content: "انضم إلى المسابقة عبر التسجيل بالبرومو كود الخاص بنا ورفع صور التأكيد.",
      },
      { property: "og:title", content: "المشاركة في المسابقة" },
      {
        property: "og:description",
        content: "انضم إلى المسابقة عبر التسجيل بالبرومو كود الخاص بنا ورفع صور التأكيد.",
      },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - start) / 3000) * 100));
    }, 40);
    const timeout = window.setTimeout(() => {
      navigate({ to: "/terms" });
    }, 3000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6"
    >
      <Particles />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_35%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_62%)]" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="glass rounded-full p-6">
          <img
            src={logo}
            alt="شعار المسابقة"
            width={1024}
            height={1024}
            className="w-36 drop-shadow-[0_0_35px_rgba(255,196,80,0.35)] sm:w-44"
          />
        </div>

        <h1 className="gold-text mt-8 text-center text-3xl font-black tracking-tight sm:text-4xl">
          المشاركة في المسابقة
        </h1>
        <p className="mt-2 text-center text-xs tracking-[0.35em] text-muted-foreground">
          KAJO ARENA
        </p>

        <div className="glass mt-10 w-72 rounded-2xl p-4 sm:w-80">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-background/60">
            <div
              className="h-full rounded-full bg-gradient-to-l from-primary via-accent to-primary shadow-[0_0_18px_rgba(255,196,80,0.6)] transition-[width] duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            جاري التحميل… {Math.round(progress)}%
          </p>
        </div>
      </div>
    </main>
  );
}
