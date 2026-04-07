import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Head of Talent, TechFlow",
    content: "Brainhire AI cut our screening time by 85%. The transparency in AI decisions is exactly what we needed for fair hiring.",
    rating: 5,
  },
  {
    name: "Marcus Johnson",
    role: "HR Director, GrowthCo",
    content: "The bias reduction features give us confidence that we're evaluating candidates on merit. Truly game-changing.",
    rating: 5,
  },
  {
    name: "Emily Park",
    role: "Recruiter, StartupHQ",
    content: "Managing applicants from multiple sources in one place is incredible. The AI rankings save me hours every week.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
            Trusted by Recruiters Everywhere
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            See what hiring professionals say about Brainhire AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card className="h-full border-border">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-foreground text-sm leading-relaxed mb-4">"{t.content}"</p>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t.name}</p>
                    <p className="text-muted-foreground text-xs">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
