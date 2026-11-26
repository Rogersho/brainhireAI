import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Head of Talent, TechFlow",
    content:
      "Hoobe HR cut our screening time by 85%. Having clear reasoning behind every score gave our hiring managers immediate confidence.",
  },
  {
    name: "Marcus Johnson",
    role: "HR Director, GrowthCo",
    content:
      "Consistent, structured candidate evaluations mean we hire on merit. It replaced three separate spreadsheets in a single afternoon.",
  },
  {
    name: "Emily Park",
    role: "Lead Recruiter, StartupHQ",
    content:
      "Clean, fast, and focused. I spend my week talking to great candidates instead of skimming hundreds of unformatted PDFs.",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 md:py-32 border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-6">
        <div className="max-w-xl mb-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Customers
          </p>
          <h2 className="font-heading text-3xl md:text-4xl font-medium tracking-tight text-foreground">
            Trusted by focused hiring teams.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {testimonials.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="flex flex-col justify-between border-t border-border pt-6"
            >
              <blockquote className="text-sm text-foreground leading-relaxed">
                &ldquo;{t.content}&rdquo;
              </blockquote>
              <figcaption className="mt-6">
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.role}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
