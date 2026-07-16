import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Sparkles, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";
import { LanguageThemeMenu } from "@/components/LanguageThemeMenu";
import { AF_PROVINCES } from "@/lib/provinces";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — AfghanMarket" },
      { name: "description", content: "Sign in to AfghanMarket to post and save listings." },
    ],
  }),
  component: AuthPage,
});

type Method = "email" | "phone";
type Mode = "signin" | "signup";

// Afghan mobile: +93 followed by 9 digits, starting with 7 (per Afghan mobile numbering)
const AF_PHONE_RE = /^\+937\d{8}$/;

function normalizeAfPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("93")) return "+" + digits;
  if (digits.startsWith("0")) return "+93" + digits.slice(1);
  if (digits.startsWith("7") && digits.length === 9) return "+93" + digits;
  return input.startsWith("+") ? input : "+" + digits;
}

function AuthPage() {
  const t = useT();
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });

  const [method, setMethod] = useState<Method>("email");
  const [mode, setMode] = useState<Mode>("signin");

  // Shared
  const [fullName, setFullName] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  // Email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone
  const [phone, setPhone] = useState("+93");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, display_name: fullName.split(" ")[0] || fullName },
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase
            .from("profiles")
            .update({
              full_name: fullName,
              display_name: fullName.split(" ")[0] || fullName,
              province,
              city,
            })
            .eq("id", data.user.id);
        }
        toast.success(t("auth.success.signup"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.success.signin"));
      }
      navigate({ to: redirect ?? "/" });
    } catch (err) {
      toast.error((err as Error).message || t("auth.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeAfPhone(phone);
    if (!AF_PHONE_RE.test(normalized)) {
      toast.error(t("auth.phone.invalid"));
      return;
    }
    setPhone(normalized);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalized,
        options: {
          shouldCreateUser: mode === "signup",
          data:
            mode === "signup"
              ? { full_name: fullName, display_name: fullName.split(" ")[0] || fullName }
              : undefined,
        },
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success(t("auth.otp.sent"));
    } catch (err) {
      toast.error((err as Error).message || t("auth.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });
      if (error) throw error;
      if (mode === "signup" && data.user) {
        await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            display_name: fullName.split(" ")[0] || fullName,
            phone,
            province,
            city,
          })
          .eq("id", data.user.id);
      }
      toast.success(t("auth.success.signin"));
      navigate({ to: redirect ?? "/" });
    } catch (err) {
      toast.error((err as Error).message || t("auth.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-brand grid h-9 w-9 place-items-center rounded-xl shadow-elevated">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold tracking-tight">{t("app.name")}</span>
        </div>
        <LanguageThemeMenu />
      </header>

      <main className="mx-auto max-w-xl px-5 pb-10 pt-2">
        <h1 className="text-balance text-2xl font-bold">{t("auth.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.subtitle")}</p>

        {/* Method: Email vs Phone */}
        <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1 shadow-card">
          {(
            [
              { k: "email" as Method, icon: Mail, label: t("auth.method.email") },
              { k: "phone" as Method, icon: Phone, label: t("auth.method.phone") },
            ]
          ).map(({ k, icon: Icon, label }) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setMethod(k);
                setOtpSent(false);
              }}
              className={`tap-highlight-none flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                method === k
                  ? "bg-gradient-brand text-primary-foreground shadow-elevated"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Mode: Sign in vs Sign up */}
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setOtpSent(false);
              }}
              className={`tap-highlight-none rounded-xl py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                mode === m ? "bg-accent text-foreground" : "text-muted-foreground"
              }`}
            >
              {t(m === "signin" ? "auth.signinTab" : "auth.signupTab")}
            </button>
          ))}
        </div>

        {method === "email" ? (
          <form onSubmit={handleEmail} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <Field label={t("auth.fullName")} help={t("auth.fullName.help")}>
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("auth.province")} help={t("auth.province.help")}>
                    <select
                      required
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">—</option>
                      {AF_PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("auth.city")}>
                    <input
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </Field>
                </div>
              </>
            )}
            <Field label={t("auth.email")}>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </Field>
            <Field label={t("auth.password")}>
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-brand text-primary-foreground tap-highlight-none w-full rounded-2xl py-3.5 text-sm font-semibold shadow-elevated transition-opacity disabled:opacity-50"
            >
              {loading
                ? t("common.loading")
                : t(mode === "signin" ? "auth.submit.signin" : "auth.submit.signup")}
            </button>
          </form>
        ) : (
          <form onSubmit={otpSent ? verifyOtp : requestOtp} className="mt-6 space-y-4">
            {!otpSent ? (
              <>
                {mode === "signup" && (
                  <>
                    <Field label={t("auth.fullName")} help={t("auth.fullName.help")}>
                      <input
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t("auth.province")} help={t("auth.province.help")}>
                        <select
                          required
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">—</option>
                          {AF_PROVINCES.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label={t("auth.city")}>
                        <input
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </Field>
                    </div>
                  </>
                )}
                <Field label={t("auth.phone.af")} help={t("auth.phone.af.help")}>
                  <input
                    required
                    inputMode="tel"
                    type="tel"
                    dir="ltr"
                    placeholder="+937XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </Field>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-brand text-primary-foreground tap-highlight-none w-full rounded-2xl py-3.5 text-sm font-semibold shadow-elevated transition-opacity disabled:opacity-50"
                >
                  {loading ? t("common.loading") : t("auth.otp.send")}
                </button>
              </>
            ) : (
              <>
                <Field label={t("auth.otp.code")} help={`${t("auth.otp.sentTo")} ${phone}`}>
                  <input
                    required
                    inputMode="numeric"
                    dir="ltr"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-input bg-card px-4 py-3 text-center text-lg font-mono tracking-widest outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </Field>
                <button
                  type="submit"
                  disabled={loading || otp.length < 4}
                  className="bg-gradient-brand text-primary-foreground tap-highlight-none w-full rounded-2xl py-3.5 text-sm font-semibold shadow-elevated transition-opacity disabled:opacity-50"
                >
                  {loading ? t("common.loading") : t("auth.otp.verify")}
                </button>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full rounded-2xl border border-border bg-card py-2.5 text-xs font-medium text-muted-foreground"
                >
                  {t("common.back")}
                </button>
              </>
            )}
          </form>
        )}
      </main>
    </div>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
      {help && <div className="mt-1 text-[11px] text-muted-foreground">{help}</div>}
    </label>
  );
}
