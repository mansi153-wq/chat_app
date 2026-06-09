import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";

// ── Animation variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6 } },
};
const stagger = {
  show: { transition: { staggerChildren: 0.1 } },
};

// ── Floating orb ──────────────────────────────────────────────────────────────
function Orb({ className }) {
  return (
    <div className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`} />
  );
}

// ── Typewriter ────────────────────────────────────────────────────────────────
const WORDS = ["Instantly.", "Beautifully.", "Together.", "Privately."];
function Typewriter() {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = WORDS[idx];
    let timeout;
    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80);
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 45);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setIdx((i) => (i + 1) % WORDS.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, deleting, idx]);

  return (
    <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, gradient }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      variants={fadeUp}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 overflow-hidden cursor-default transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.06]"
    >
      {/* Glow on hover */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className={`absolute inset-0 opacity-0 rounded-2xl blur-xl ${gradient} pointer-events-none`}
        style={{ zIndex: 0 }}
      />
      <div className="relative z-10">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4 ${gradient}`}>
          {icon}
        </div>
        <h3 className="text-white font-semibold text-base mb-2 font-syne">{title}</h3>
        <p className="text-white/40 text-sm leading-relaxed font-dm">{desc}</p>
      </div>
    </motion.div>
  );
}

// ── Mock chat bubble ──────────────────────────────────────────────────────────
function MockChat() {
  const messages = [
    { id: 1, text: "hey! did you see the new design?", mine: false, time: "9:41 AM", avatar: "A" },
    { id: 2, text: "yes omg it looks so clean 🔥", mine: true, time: "9:42 AM" },
    { id: 3, text: "right?? the dark theme is chef's kiss", mine: false, time: "9:42 AM", avatar: "A" },
    { id: 4, text: "shipping it today 🚀", mine: true, time: "9:43 AM" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-sm mx-auto"
    >
      {/* Glow behind card */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/10 blur-3xl rounded-3xl scale-110" />

      <div className="relative rounded-2xl border border-white/10 bg-[#0f0f18]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="w-2 h-2 rounded-full bg-red-500/70" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
          <div className="w-2 h-2 rounded-full bg-green-500/70" />
          <div className="ml-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">A</div>
            <div>
              <div className="text-white text-xs font-semibold">Alex</div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 text-[10px]">online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="p-4 space-y-3 min-h-[200px]">
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.15 }}
              className={`flex items-end gap-2 ${msg.mine ? "flex-row-reverse" : ""}`}
            >
              {!msg.mine && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                  {msg.avatar}
                </div>
              )}
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs font-dm ${
                msg.mine
                  ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-sm"
                  : "bg-white/[0.08] text-white/80 rounded-bl-sm"
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="flex items-end gap-2"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">A</div>
            <div className="bg-white/[0.08] px-3 py-2 rounded-2xl rounded-bl-sm flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Input bar */}
        <div className="px-4 py-3 border-t border-white/[0.06] flex items-center gap-2">
          <div className="flex-1 bg-white/[0.05] rounded-xl px-3 py-2 text-white/20 text-xs font-dm">
            Message Alex…
          </div>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M3 10l14-7-5 7 5 7-14-7z" fill="white"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Floating notification badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 1.8, type: "spring", stiffness: 200 }}
        className="absolute -top-3 -right-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl px-3 py-1.5 text-xs text-white font-semibold shadow-lg border border-white/10"
      >
        ✓✓ Read
      </motion.div>

      {/* Floating reaction */}
      <motion.div
        initial={{ opacity: 0, scale: 0, x: -20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 2, type: "spring", stiffness: 200 }}
        className="absolute -bottom-3 -left-3 bg-[#1a1a2e] border border-white/10 rounded-xl px-3 py-1.5 text-sm shadow-lg"
      >
        🔥 2
      </motion.div>
    </motion.div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ value, label }) {
  return (
    <motion.div variants={fadeUp} className="text-center">
      <div className="text-3xl font-bold font-syne bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-white/40 text-sm font-dm mt-1">{label}</div>
    </motion.div>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const features = [
    { icon: "⚡", title: "Real-time Messaging", desc: "Messages delivered instantly via Socket.IO. No refresh, no delay — just pure live chat.", gradient: "bg-gradient-to-br from-indigo-500/20 to-violet-500/20" },
    { icon: "👥", title: "Group Chats", desc: "Create group conversations with multiple members. Perfect for teams and friend groups.", gradient: "bg-gradient-to-br from-purple-500/20 to-pink-500/20" },
    { icon: "✓✓", title: "Read Receipts", desc: "Know exactly when your message has been seen with single and double tick indicators.", gradient: "bg-gradient-to-br from-emerald-500/20 to-teal-500/20" },
    { icon: "😊", title: "Emoji Reactions", desc: "React to any message with 6 emoji options. Toggle to add or remove your reaction.", gradient: "bg-gradient-to-br from-yellow-500/20 to-orange-500/20" },
    { icon: "📎", title: "File & Image Sharing", desc: "Send photos and files directly in chat. Images preview inline, files download with one click.", gradient: "bg-gradient-to-br from-blue-500/20 to-cyan-500/20" },
    { icon: "🟢", title: "Online Presence", desc: "See who's online live with a real-time green indicator on every avatar.", gradient: "bg-gradient-to-br from-green-500/20 to-emerald-500/20" },
    { icon: "✏️", title: "Typing Indicators", desc: "An animated bubble appears when someone is typing so you know a reply is coming.", gradient: "bg-gradient-to-br from-pink-500/20 to-rose-500/20" },
    { icon: "🔐", title: "Secure by Default", desc: "JWT authentication, bcrypt password hashing, and SSL database connections out of the box.", gradient: "bg-gradient-to-br from-slate-500/20 to-gray-500/20" },
    { icon: "📱", title: "Mobile Responsive", desc: "Fully optimized for phones with a slide-in sidebar and touch-friendly interactions.", gradient: "bg-gradient-to-br from-violet-500/20 to-purple-500/20" },
  ];

  return (
    <div className="min-h-screen bg-[#09090e] text-white font-dm overflow-x-hidden">

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/[0.05] bg-[#09090e]/80 backdrop-blur-xl"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 3V5z" fill="white"/>
            </svg>
          </div>
          <span className="font-syne font-bold text-lg tracking-tight">Drift</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/auth")}
            className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-90 transition-opacity px-4 py-2 rounded-xl font-semibold"
          >
            Get started
          </button>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center px-6 pt-20 overflow-hidden">
        {/* Background orbs */}
        <Orb className="w-[600px] h-[600px] bg-indigo-600 -top-40 -left-40" />
        <Orb className="w-[500px] h-[500px] bg-violet-700 -bottom-20 -right-20" />
        <Orb className="w-[300px] h-[300px] bg-purple-600 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        {/* Grid bg */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Real-time · Open Source · Free
            </motion.div>

            <motion.h1 variants={fadeUp} className="font-syne font-extrabold text-5xl lg:text-6xl leading-[1.1] tracking-tight mb-4">
              Chat with anyone,{" "}
              <br />
              <Typewriter />
            </motion.h1>

            <motion.p variants={fadeUp} className="text-white/50 text-lg leading-relaxed mb-8 max-w-md">
              Drift is a modern real-time messaging app with group chats, reactions, read receipts, file sharing, and a beautiful dark UI.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/auth")}
                className="group flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 transition-all px-6 py-3 rounded-2xl font-semibold text-sm shadow-lg shadow-indigo-500/25"
              >
                Start chatting free
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="none">
                  <path d="M5 10h10M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <a
                href="#features"
                className="flex items-center gap-2 border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all px-6 py-3 rounded-2xl text-sm text-white/70 hover:text-white"
              >
                See features
              </a>
            </motion.div>

            {/* Social proof */}
            <motion.div variants={fadeUp} className="flex items-center gap-4 mt-8">
              <div className="flex -space-x-2">
                {["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981"].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#09090e] flex items-center justify-center text-xs font-bold text-white" style={{ background: c }}>
                    {["A","B","C","D","E"][i]}
                  </div>
                ))}
              </div>
              <div className="text-sm text-white/40">
                Join people already drifting
              </div>
            </motion.div>
          </motion.div>

          {/* Right — mock chat */}
          <div className="flex justify-center lg:justify-end">
            <MockChat />
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 text-xs"
        >
          <span>scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 border-y border-white/[0.05] bg-white/[0.01]">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="max-w-3xl mx-auto px-6 grid grid-cols-3 gap-8"
        >
          <StatCard value="< 50ms" label="Message latency" />
          <StatCard value="9 +" label="Core features" />
          <StatCard value="100%" label="Open source" />
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-28 px-6 relative overflow-hidden">
        <Orb className="w-[400px] h-[400px] bg-violet-700 top-0 right-0 opacity-10" />

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-5xl mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold mb-4">
              Everything you need
            </div>
            <h2 className="font-syne font-extrabold text-4xl lg:text-5xl tracking-tight mb-4">
              Built for real conversations
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Every feature designed to make chatting feel fast, natural, and enjoyable.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-28 px-6 bg-white/[0.01] border-y border-white/[0.05]">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold mb-4">
              Simple to start
            </div>
            <h2 className="font-syne font-extrabold text-4xl lg:text-5xl tracking-tight">
              Up and running in seconds
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create your account", desc: "Register with a username and email. No credit card, no verification — just sign up and go.", icon: "👤" },
              { step: "02", title: "Find someone to chat", desc: "Search for any user by name or email and start a DM, or create a group with multiple people.", icon: "🔍" },
              { step: "03", title: "Start drifting", desc: "Send messages, share files, react with emojis, and see who's online — all in real time.", icon: "💬" },
            ].map((item) => (
              <motion.div key={item.step} variants={fadeUp} className="relative">
                <div className="text-6xl font-syne font-extrabold text-white/[0.04] absolute -top-4 -left-2">{item.step}</div>
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center text-2xl mb-4">
                    {item.icon}
                  </div>
                  <h3 className="font-syne font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <Orb className="w-[500px] h-[500px] bg-indigo-600 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-15" />

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
          className="relative z-10 max-w-2xl mx-auto text-center"
        >
          <motion.h2 variants={fadeUp} className="font-syne font-extrabold text-4xl lg:text-5xl tracking-tight mb-4">
            Ready to{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              start drifting?
            </span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-white/40 text-lg mb-8">
            Free forever. No setup required. Just open the app and start chatting.
          </motion.p>
          <motion.button
            variants={fadeUp}
            onClick={() => navigate("/auth")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 transition-all px-8 py-4 rounded-2xl font-semibold text-base shadow-xl shadow-indigo-500/25"
          >
            Create your free account →
          </motion.button>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 3V5z" fill="white"/>
              </svg>
            </div>
            <span className="font-syne font-bold text-sm">Drift</span>
          </div>
          <div className="text-white/25 text-xs">
            Built with React · Node.js · Socket.IO · MySQL
          </div>
          <button
            onClick={() => navigate("/auth")}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Launch app →
          </button>
        </div>
      </footer>
    </div>
  );
}
