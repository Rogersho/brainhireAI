import { Upload, Brain, ListChecks, UserCheck } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Post a Job",
    description: "Create a detailed job posting with requirements, skills, and qualifications.",
  },
  {
    icon: Brain,
    step: "02",
    title: "AI Screens Applicants",
    description: "Our AI analyzes resumes, extracts key data, and evaluates each candidate against your criteria.",
  },
  {
    icon: ListChecks,
    step: "03",
    title: "Review Rankings",
    description: "See candidates ranked by fit with transparent scoring, strengths, and weaknesses.",
  },
  {
    icon: UserCheck,
    step: "04",
    title: "Make Informed Decisions",
    description: "Shortlist top candidates with confidence, backed by AI-generated insights and recommendations.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-accent/20 dark:bg-muted/20">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            How Brainhire AI Works
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Four simple steps from job posting to perfect hire.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              className="text-center"
            >
              <div className="relative mx-auto mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 font-heading text-xs font-bold text-primary bg-primary/10 rounded-full h-7 w-7 flex items-center justify-center">
                  {step.step}
                </span>
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
