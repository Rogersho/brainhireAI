import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background Orbs/Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] rounded-full bg-primary/10 blur-[120px] dark:bg-primary/5" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] rounded-full bg-primary/10 blur-[120px] dark:bg-primary/5" />
      </div>

      <div className="container px-4 mx-auto">
        <div className="relative glass-card bg-secondary/30 dark:bg-card/40 border border-border/50 backdrop-blur-xl rounded-[2.5rem] p-12 md:p-20 text-center overflow-hidden">
          {/* Subtle pattern background */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-8 animate-fade-in shadow-sm border border-primary/20">
              <Sparkles className="h-3 w-3" />
              <span>Get Started Today</span>
            </div>
            
            <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Ready to Transform Your <span className="text-primary italic">Hiring?</span>
            </h2>
            
            <p className="mt-4 text-muted-foreground text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
              Join thousands of forward-thinking recruiters using AI to find the best talent <span className="text-foreground font-medium underline decoration-primary/30 underline-offset-4">10x faster</span>.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Button size="lg" asChild className="h-14 px-10 text-base font-semibold group relative overflow-hidden transition-all hover:shadow-xl hover:shadow-primary/20 active:scale-95">
                <Link href="/signup" className="flex items-center">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild className="h-14 px-10 text-base font-semibold border-border/50 hover:bg-background/80 dark:hover:bg-card transition-all active:scale-95">
                <Link href="/login">Schedule a Demo</Link>
              </Button>
            </div>
            
            <p className="mt-8 text-xs text-muted-foreground/60 font-medium italic">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
