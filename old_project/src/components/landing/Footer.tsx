import { Brain, Twitter, Github, Linkedin, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background py-16">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 font-heading text-xl font-bold text-foreground mb-4">
              <Brain className="h-6 w-6 text-primary animate-pulse" />
              <span>Brainhire <span className="text-primary">AI</span></span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              AI-driven talent acquisition and automated screening to help you hire 10x faster with better accuracy.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-heading font-semibold mb-6">Product</h3>
            <ul className="space-y-4">
              <li><Link to="/screening" className="text-sm text-muted-foreground hover:text-primary transition-colors">AI Screening</Link></li>
              <li><Link to="/jobs" className="text-sm text-muted-foreground hover:text-primary transition-colors">Job Posting</Link></li>
              <li><Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Candidate Management</Link></li>
              <li><Link to="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Marketplace</Link></li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-heading font-semibold mb-6">Company</h3>
            <ul className="space-y-4">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">About</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
              <li><Link to="/settings" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Newsletter/Contact */}
          <div>
            <h3 className="font-heading font-semibold mb-6">Stay Connected</h3>
            <div className="flex bg-muted/50 rounded-full p-1 pl-4 mb-4 border border-border focus-within:border-primary transition-colors">
              <input
                type="email"
                placeholder="Email address"
                className="bg-transparent border-none outline-none text-sm w-full py-2 placeholder:text-muted-foreground"
              />
              <button className="bg-primary text-white rounded-full px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition-all active:scale-95 shadow-sm">
                Subscribe
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground px-2">
              Join 1,000+ teams getting weekly AI hiring tips.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {currentYear} Brainhire AI.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
