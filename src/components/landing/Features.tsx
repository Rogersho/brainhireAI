import { Brain, BarChart3, Users, FileSearch, Shield, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const features = [
  {
    icon: Brain,
    title: "AI-Driven Screening",
    description: "Automatically analyze resumes, extract skills, and evaluate candidates against job requirements using advanced AI.",
  },
  {
    icon: Shield,
    title: "Bias Reduction",
    description: "Our AI is designed to minimize unconscious bias, ensuring fair and equitable evaluation of every applicant.",
  },
  {
    icon: BarChart3,
    title: "Automated Ranking",
    description: "Candidates are ranked by fit, skills, and experience. Instantly see your top matches with detailed scoring.",
  },
  {
    icon: FileSearch,
    title: "Transparent Decisions",
    description: "Every AI decision comes with a clear explanation — see exactly why a candidate was scored the way they were.",
  },
  {
    icon: Users,
    title: "Talent Pool Integration",
    description: "Screen candidates from your internal talent pool alongside external applicants in a unified workflow.",
  },
  {
    icon: Globe,
    title: "Multi-Platform Sourcing",
    description: "Import applicants from external job boards and platforms. All candidates, one intelligent dashboard.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            Everything You Need to Hire Better
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Powerful tools designed to make recruitment smarter, faster, and fairer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card className="h-full border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
