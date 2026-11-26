import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const metrics = [
  { value: "85%", label: "Less screening time" },
  { value: "100%", label: "Explainable AI scores" },
  { value: "10x", label: "Faster shortlisting" },
];

export function Hero() {
  return (
    <section className="pt-36 pb-24 md:pt-44 md:pb-32 bg-background">
      <div className="mx-auto max-w-5xl px-6">
        <div className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-6"
          >
            Hoobe HR — AI Recruitment Platform
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="font-heading text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-foreground leading-[1.08]"
          >
            Hiring made clear,
            <br />
            fast, and fair.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
            className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl font-normal"
          >
            Hoobe HR evaluates resumes, extracts verified skills, and ranks applicants with transparent AI reasoning — removing noise from every hiring decision.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.24 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Button size="lg" asChild className="rounded-full px-7 h-11 text-sm font-medium">
              <Link href="/signup">
                Start hiring
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="rounded-full px-7 h-11 text-sm font-medium"
            >
              <Link href="/jobs">Browse open roles</Link>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="mt-20 pt-10 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-8"
        >
          {metrics.map((item) => (
            <div key={item.label}>
              <p className="font-heading text-3xl font-medium tracking-tight text-foreground">
                {item.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
