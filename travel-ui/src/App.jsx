import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { jsPDF } from "jspdf";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Compass,
  Download,
  MapPinned,
  Sparkles,
  Mountain,
  Landmark,
  PartyPopper,
  UtensilsCrossed,
} from "lucide-react";

const QUESTIONS = [
  { key: "city", label: "Destination", prompt: "Where do you want to travel?", helper: "Choose the city you want to explore.", placeholder: "Type a city name", kind: "text" },
  { key: "days", label: "Duration", prompt: "How many days is your trip?", helper: "A short or long trip both work fine.", placeholder: "Enter number of days", kind: "number" },
  { key: "budget", label: "Budget", prompt: "What budget should the planner follow?", helper: "Pick one: economical, moderate, or luxury.", placeholder: "economical / moderate / luxury", kind: "text" },
  { key: "style", label: "Travel pace", prompt: "How do you want the days to feel?", helper: "Relaxed, mild, or fast.", placeholder: "relaxed / mild / fast", kind: "text" },
  { key: "interests", label: "Interests", prompt: "What do you enjoy exploring most?", helper: "Examples: history, art, food, nature, nightlife.", placeholder: "history, food, nature...", kind: "text" },
];

const INTEREST_ICONS = {
  history: Landmark,
  art: Compass,
  food: UtensilsCrossed,
  nature: Mountain,
  nightlife: PartyPopper,
};

const LOADING_STAGES = [
  "Analyzing your preferences",
  "Building the structure",
  "Refining the plan",
  "Finalizing the itinerary",
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function parseInterests(raw) {
  return String(raw || "")
    .split(",")
    .map((item) => normalize(item))
    .filter(Boolean);
}

function formatTitle(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function slugify(value) {
  return String(value || "travel-plan")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "travel-plan";
}

function SoftOrb({ className, animation, duration = 20 }) {
  return (
    <motion.div
      className={className}
      animate={animation}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [form, setForm] = useState({ city: "", days: "", budget: "", style: "", interests: "" });
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(LOADING_STAGES[0]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [revealResult, setRevealResult] = useState(false);

  const currentQuestion = QUESTIONS[step];

  const summary = useMemo(
    () => [
      { label: "City", value: form.city || "—" },
      { label: "Days", value: form.days || "—" },
      { label: "Budget", value: form.budget || "—" },
      { label: "Style", value: form.style || "—" },
    ],
    [form]
  );

  const progress = loading || result ? 100 : Math.max(0, (step / QUESTIONS.length) * 100);

  const itineraryDays = useMemo(() => {
    const raw = result?.itinerary;

    if (Array.isArray(raw)) return raw;

    if (raw && typeof raw === "object") {
      return Object.entries(raw)
        .sort(([a], [b]) => {
          const na = Number(a.match(/\d+/)?.[0] || 0);
          const nb = Number(b.match(/\d+/)?.[0] || 0);
          return na - nb;
        })
        .map(([label, places]) => ({
          label,
          places: Array.isArray(places) ? places : [],
          is_free_day: Array.isArray(places) && places.length === 0,
        }));
    }

    return [];
  }, [result]);

function buildPdfBlob() {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  let y = 54;
  let pageNumber = 1;

  const paintBackground = () => {
    doc.setFillColor(10, 15, 28);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
  };

  const addPageNumber = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 18, { align: "right" });
  };

  const startNewPage = () => {
    addPageNumber();
    doc.addPage();
    pageNumber += 1;
    paintBackground();
    y = 50;
  };

  const ensureSpace = (needed = 24) => {
    if (y + needed > pageHeight - 42) {
      startNewPage();
    }
  };

  // first page background
  paintBackground();

    const addHeading = (text) => {
      ensureSpace(38);
      doc.setFillColor(17, 24, 39);
      doc.roundedRect(margin, y - 16, contentWidth, 28, 8, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(text, margin + 12, y + 4);
      y += 28;
    };

    const addBody = (text, opts = {}) => {
      const { bold = false, color = [25, 34, 52], fontSize = 11, indent = 0 } = opts;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(text, contentWidth - indent);
      ensureSpace(lines.length * 15 + 8);
      doc.text(lines, margin + (indent ? 14 : 0), y);
      y += lines.length * 15 + 8;
    };

    doc.setFillColor(10, 15, 28);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(`Travel Plan for ${form.city || "Your Trip"}`, margin, y);
    y += 22;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(190, 198, 214);
    doc.text(
      `Days: ${form.days || "—"}    Budget: ${form.budget || "—"}    Pace: ${form.style || "—"}`,
      margin,
      y
    );
    y += 16;

    doc.setFontSize(11);
    doc.text(`Interests: ${form.interests || "—"}`, margin, y);
    y += 22;

    if (result?.notice) {
      addBody(result.notice, { bold: true, color: [245, 158, 11], fontSize: 11 });
      y += 4;
    }

    itineraryDays.forEach((dayObj) => {
      const dayLabel = dayObj.label || `Day ${dayObj.day}`;
      const places = dayObj.places || [];

      addHeading(dayLabel);

      if (places.length === 0) {
        addBody("Free day — feel free to roam and explore the city on your own.", {
          color: [226, 232, 240],
          fontSize: 11,
        });
      } else {
        places.forEach((place, index) => {
          ensureSpace(52);
          doc.setDrawColor(55, 65, 81);
          doc.roundedRect(margin, y - 13, contentWidth, 44, 10, 10, "S");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.setTextColor(255, 255, 255);
          const titleLines = doc.splitTextToSize(`${index + 1}. ${place.name}`, contentWidth - 24);
          doc.text(titleLines, margin + 12, y + 2);

          const subtitle = `${place.category} · Budget: ${formatTitle(place.budget || "unknown")} · Rating: ${place.rating ?? "—"}`;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(187, 198, 211);
          doc.text(doc.splitTextToSize(subtitle, contentWidth - 24), margin + 12, y + 18);

          if (place.score !== undefined) {
            doc.setFontSize(9);
            doc.setTextColor(147, 197, 253);
            doc.text(`Score: ${place.score}`, pageWidth - margin - 12, y + 18, { align: "right" });
          }

          y += 54;
        });
      }

      y += 6;
    });

  

    addPageNumber();
    return doc;
  }

  async function exportItinerary() {
    if (!result) return;
    const doc = buildPdfBlob();
    doc.save(`${slugify(form.city || "travel-plan")}-itinerary.pdf`);
  }

  async function handleBuildPlan(nextForm) {
    setLoading(true);
    setError("");
    setResult(null);
    setRevealResult(false);
    setLoadingStage(LOADING_STAGES[0]);

    try {
      const fetchPromise = fetch("http://127.0.0.1:5000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: nextForm.city,
          days: Number(nextForm.days),
          budget: normalize(nextForm.budget),
          style: normalize(nextForm.style),
          interests: parseInterests(nextForm.interests),
        }),
      }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Failed to generate itinerary");
        }
        return data;
      });

      for (const stage of LOADING_STAGES) {
        setLoadingStage(stage);
        await delay(3500);
      }

      const data = await fetchPromise;
      setResult(data);
      setRevealResult(true);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function goNext() {
    if (!currentQuestion) return;
    const value = input.trim();
    if (!value) return;

    const nextForm = { ...form, [currentQuestion.key]: value };
    setForm(nextForm);
    setInput("");

    if (step === QUESTIONS.length - 1) {
      handleBuildPlan(nextForm);
      return;
    }

    setStep((prev) => prev + 1);
  }

  function goBack() {
    if (loading || step === 0) return;
    const previousKey = QUESTIONS[step - 1].key;
    setStep((prev) => prev - 1);
    setInput(form[previousKey] || "");
  }

  function resetAll() {
    setStep(0);
    setInput("");
    setForm({ city: "", days: "", budget: "", style: "", interests: "" });
    setLoading(false);
    setLoadingStage(LOADING_STAGES[0]);
    setResult(null);
    setError("");
    setRevealResult(false);
  }

  const notice = result?.notice || "";

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-[#070b14] text-slate-100" style={{ backgroundColor: "#070b14" }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,180,100,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(80,170,255,0.10),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(255,225,120,0.08),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(120,230,180,0.09),_transparent_24%)]" />

        <SoftOrb className="absolute left-[-8rem] top-[-6rem] h-[26rem] w-[26rem] rounded-full bg-orange-500/10 blur-3xl" animation={{ x: [0, 48, -22, 0], y: [0, 22, -10, 0], scale: [1, 1.08, 0.98, 1] }} duration={22} />
        <SoftOrb className="absolute right-[-10rem] top-[3rem] h-[28rem] w-[28rem] rounded-full bg-sky-500/10 blur-3xl" animation={{ x: [0, -34, 18, 0], y: [0, 38, -14, 0], scale: [1, 1.07, 0.99, 1] }} duration={24} />
        <SoftOrb className="absolute bottom-[-10rem] left-[15%] h-[32rem] w-[32rem] rounded-full bg-amber-400/10 blur-3xl" animation={{ x: [0, 28, -18, 0], y: [0, -22, 14, 0], scale: [1, 1.06, 1, 1] }} duration={26} />
        <motion.div className="absolute inset-0 opacity-20 mix-blend-screen" animate={{ rotate: 360 }} transition={{ duration: 52, repeat: Infinity, ease: "linear" }} style={{ background: "conic-gradient(from 0deg, rgba(255,179,102,0.12), rgba(128,198,255,0.12), rgba(255,233,140,0.12), rgba(173,231,196,0.12), rgba(255,179,102,0.12))" }} />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full">
          <motion.div className="mx-auto max-w-4xl rounded-[2.25rem] border border-white/8 bg-white/5 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-sm shadow-sky-500/10">
                  <MapPinned className="h-5 w-5 text-sky-300" />
                </div>
                <div>
                  <div className="font-mono text-[0.64rem] uppercase tracking-[0.42em] text-slate-400">AI Travel Planner</div>
                  <div className="font-sans text-lg font-semibold tracking-tight text-white sm:text-xl">
                    {loading ? "Constructing your itinerary" : result && revealResult ? "Your itinerary is ready" : "Answer one step at a time"}
                  </div>
                </div>
              </div>

              <button type="button" onClick={resetAll} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
                Start over
              </button>
            </div>

            {!loading && !result && (
              <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-orange-300" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.35, ease: "easeOut" }} />
              </div>
            )}

            <AnimatePresence mode="wait">
              {!loading && !result && (
                <motion.div key={`question-${step}`} initial={{ opacity: 0, y: 24, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -24, filter: "blur(8px)" }} transition={{ duration: 0.34 }} className="min-h-[340px]">
                  <div className="mb-6 flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.3em] text-slate-400">
                    <Sparkles className="h-4 w-4 text-sky-300" />
                    {QUESTIONS[step].label}
                  </div>

                  <div className="max-w-2xl">
                    <h1 className="font-sans text-3xl font-semibold tracking-tight text-white sm:text-4xl">{QUESTIONS[step].prompt}</h1>
                    <p className="mt-4 max-w-xl font-sans text-sm leading-6 text-slate-300 sm:text-[0.98rem]">{QUESTIONS[step].helper}</p>
                  </div>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input autoFocus type={QUESTIONS[step].kind === "number" ? "number" : "text"} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") goNext(); }} placeholder={QUESTIONS[step].placeholder} className="w-full rounded-2xl border border-white/10 bg-[#0c1220] px-5 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/40 focus:ring-4 focus:ring-sky-500/10" />
                    <button type="button" onClick={goNext} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-6 py-4 font-semibold text-white shadow-sm transition hover:border-white/20 hover:bg-white/12 active:scale-[0.99]">
                      {step === QUESTIONS.length - 1 ? "Build plan" : "Continue"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-8 flex items-center justify-between gap-4 text-xs text-slate-400">
                    <div className="font-mono uppercase tracking-[0.22em]">Step {step + 1} of {QUESTIONS.length}</div>
                    <div className="flex items-center gap-2 font-sans">
                      <div className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.45)]" />
                      The planner is listening
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-4">
                    {summary.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-sm">
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{item.label}</div>
                        <div className="mt-1 font-sans text-sm font-medium tracking-tight text-white">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
                    {(parseInterests(form.interests).length ? parseInterests(form.interests) : ["history", "food", "nature"]).map((interest) => {
                      const Icon = INTEREST_ICONS[interest] || Compass;
                      return (
                        <div key={interest} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 shadow-sm">
                          <Icon className="h-3.5 w-3.5 text-sky-300" />
                          <span className="font-sans">{interest}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <button type="button" onClick={goBack} disabled={step === 0} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35">
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </button>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-orange-300 shadow-[0_0_18px_rgba(251,191,36,0.35)]" />
                      Soft motion · refined dark effect
                    </div>
                  </div>
                </motion.div>
              )}

              {loading && !result && (
                <motion.div key="loading" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35 }} className="flex min-h-[360px] flex-col items-center justify-center text-center">
                  <motion.div className="relative mb-8 flex h-36 w-36 items-center justify-center" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}>
                    <div className="absolute inset-0 rounded-full border border-sky-300/25" />
                    <div className="absolute inset-3 rounded-full border border-amber-300/25" />
                    <div className="absolute inset-6 rounded-full border border-emerald-300/20" />
                    <div className="absolute inset-9 rounded-full border border-orange-300/20" />
                    <motion.div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-400/90 via-amber-300/90 to-orange-300/90 shadow-lg shadow-sky-500/20" animate={{ scale: [1, 1.08, 0.98, 1], rotate: [0, 6, -6, 0] }} transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }} />
                  </motion.div>

                  <AnimatePresence mode="wait">
                    <motion.div key={loadingStage} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }} className="font-sans text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                      {loadingStage}
                    </motion.div>
                  </AnimatePresence>

                  <p className="mt-4 max-w-xl font-sans text-sm leading-6 text-slate-300 sm:text-[0.98rem]">
                    The itinerary is being shaped to fit your interests, budget, and travel pace.
                  </p>

                  <div className="mt-8 flex items-center gap-2">
                    {[0, 1, 2].map((dot) => (
                      <motion.span key={dot} className="h-2.5 w-2.5 rounded-full bg-sky-300" animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.2 }} />
                    ))}
                  </div>
                </motion.div>
              )}

              {result && revealResult && (
                <motion.div key="result" initial={{ opacity: 0, y: 18, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.45 }} className="min-h-[360px]">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs uppercase tracking-[0.32em] text-slate-400">Generated Plan</div>
                      <h2 className="mt-2 font-sans text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                        Your {form.city} itinerary
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={exportItinerary} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white">
                        <Download className="h-4 w-4" />
                        Export PDF
                      </button>
                      <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-200">
                        <Check className="h-4 w-4" />
                        Ready
                      </div>
                    </div>
                  </div>

                  {notice ? (
                    <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100 shadow-sm">
                      {notice}
                    </div>
                  ) : null}

                  {error ? (
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100 shadow-sm">
                      {error}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {itineraryDays.map((dayObj) => {
                        const dayLabel = dayObj.label || `Day ${dayObj.day}`;
                        const places = dayObj.places || [];

                        return (
                          <div key={dayLabel} className="rounded-3xl border border-white/10 bg-[#0c1220] p-4 shadow-lg shadow-black/20 sm:p-5">
                            <div className="mb-4 flex items-center justify-between">
                              <div className="font-sans text-lg font-semibold tracking-tight text-white">{dayLabel}</div>
                              <div className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
                                {places.length} place{places.length > 1 ? "s" : ""}
                              </div>
                            </div>

                            {places.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                                Free day — feel free to roam and explore the city on your own.
                              </div>
                            ) : (
                              <div className="grid gap-3">
                                {places.map((place, index) => (
                                  <motion.div
                                    key={`${dayLabel}-${place.name}-${index}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25, delay: index * 0.05 }}
                                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div>
                                      <div className="font-sans text-base font-semibold tracking-tight text-white">
                                        {place.name}
                                      </div>
                                      <div className="mt-1 font-sans text-sm text-slate-300">
                                        {place.category} · Cached dataset
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                                      <span className="rounded-full border border-white/10 bg-[#0f172a] px-3 py-1 shadow-sm">
                                        Budget: {formatTitle(place.budget || "unknown")}
                                      </span>
                                      <span className="rounded-full border border-white/10 bg-[#0f172a] px-3 py-1 shadow-sm">
                                        Rating: {place.rating ?? "—"}
                                      </span>
                                      {place.score !== undefined && (
                                        <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-sky-200 shadow-sm">
                                          Score: {place.score}
                                        </span>
                                      )}
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


