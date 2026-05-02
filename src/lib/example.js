/**
 * example.js — the default presentation shown on first visit.
 *
 * Showcases:
 *   • Tailwind utility classes
 *   • Framer Motion (motion.*, transitions, hover effects)
 *   • Lucide icons via the global <Icon name="..." />
 *   • Interactive React state
 *
 * The transform pipeline strips imports — these libs are exposed as globals.
 */

export const defaultExample = `// عرض تفاعلي — Tailwind + Framer Motion + Lucide
// ⌘/Ctrl+Enter = شغّل · F = ملء الشاشة · ESC = خروج

export default function Presentation() {
  const [step, setStep] = useState(0);
  const features = [
    { icon: 'zap',     title: 'سريع',    desc: 'JSX يتحوّل ويتشغّل فوراً في المتصفح.' },
    { icon: 'palette', title: 'مرن',     desc: 'Tailwind و Framer Motion و Lucide جاهزين.' },
    { icon: 'rocket',  title: 'تفاعلي',  desc: 'صمّم تجارب كاملة — مو شرائح ثابتة.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white flex items-center justify-center p-8 overflow-hidden">
      <div className="max-w-5xl w-full">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="inline-block mb-6"
          >
            <Icon name="sparkles" size={64} className="text-amber-300" />
          </motion.div>
          <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-4 bg-gradient-to-r from-amber-200 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
            عروض تفاعلية
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            استبدل الشرائح الثابتة بصفحات React حقيقية. الكود = العرض.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
              whileHover={{ scale: 1.05, y: -4 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                <Icon name={f.icon} size={24} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{f.title}</h3>
              <p className="text-slate-300 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Interactive counter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
        >
          <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">عدّاد تفاعلي</p>
          <motion.div
            key={step}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-7xl font-black mb-6 text-amber-300"
          >
            {step}
          </motion.div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-medium"
            >
              − ناقص
            </button>
            <button
              onClick={() => setStep(0)}
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors font-medium"
            >
              صفّر
            </button>
            <button
              onClick={() => setStep((s) => s + 1)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 transition-all font-medium"
            >
              زائد +
            </button>
          </div>
        </motion.div>

        <p className="text-center text-slate-500 text-sm mt-12">
          F = ملء الشاشة · ESC = خروج · ⌘/Ctrl+Enter = شغّل
        </p>
      </div>
    </div>
  );
}
`;
