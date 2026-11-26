import { Sparkles, ShieldCheck, BarChart3, FileText, Users, Globe } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Sparkles,
    title: "Structured AI screening",
    description:
      "Automatically parse resumes, map core skills, and score every applicant against your exact role criteria.",
  },
  {
    icon: ShieldCheck,
    title: "Merit-first evaluation",
    description:
      "Standardized scoring rubrics minimize unconscious bias so teams focus strictly on capability and fit.",
  },
  {
    icon: BarChart3,
    title: "Instant candidate ranking",
    description:
      "Surface top talent immediately with clear match percentages and side-by-side strengths.",
  },
  {
    icon: FileText,
    title: "Transparent reasoning",
    description:
      "Every AI score includes concise strengths, gaps, and a clear hiring recommendation — never a black box.",
  },
  {
    icon: Users,
    title: "Unified talent workspace",
    description:
      "Manage job postings, applicants, cloud-stored resumes, and hiring stages in one calm interface.",
  },
  {
    icon: Globe,
    title: "Candidate-friendly portal",
    description:
      "Give applicants a clean job board, master CV analysis, and real-time application status updates.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 md:py-32 border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-6">
        <div className="max-w-xl mb-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Capabilities
          </p>
          <h2 className="font-heading text-3xl md:text-4xl font-medium tracking-tight text-foreground">
            Everything you need, nothing you don&apos;t.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="space-y-3"
            >
              <feature.icon className="h-5 w-5 text-foreground stroke-[1.75]" />
              <h3 className="font-heading text-base font-medium text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
