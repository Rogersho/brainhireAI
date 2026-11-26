import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    title: "Publish a role",
    description: "Define responsibilities, department, and required skills in under a minute.",
  },
  {
    step: "02",
    title: "Collect resumes",
    description: "Candidates apply with PDF resumes stored securely and parsed automatically.",
  },
  {
    step: "03",
    title: "Run AI evaluation",
    description: "Hoobe HR scores each applicant with strengths, skill gaps, and clear recommendations.",
  },
  {
    step: "04",
    title: "Shortlist & hire",
    description: "Move top candidates through review stages while keeping applicants automatically informed.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 border-t border-border bg-muted/25">
      <div className="mx-auto max-w-5xl px-6">
        <div className="max-w-xl mb-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Process
          </p>
          <h2 className="font-heading text-3xl md:text-4xl font-medium tracking-tight text-foreground">
            From job posting to offer in four calm steps.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="border-t border-border pt-6"
            >
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {item.step}
              </span>
              <h3 className="mt-3 font-heading text-base font-medium text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
