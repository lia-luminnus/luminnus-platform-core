import { Linkedin, Instagram, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import luminnusSymbol from "@/assets/luminnus-symbol.png";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const [email, setEmail] = useState("");
  const { t } = useLanguage();

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast({
        title: t('footer_newsletter_success'),
        description: t('footer_newsletter_desc')
      });
      setEmail("");
    }
  };

  return (
    <footer id="contato" className="relative border-t border-white/10 py-12 lg:py-16 overflow-hidden bg-[#0B0B0F]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0F] to-primary/5" />
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Logo and Tagline */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={luminnusSymbol} alt="Luminnus Logo" className="h-10 w-auto" />
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary via-magenta to-secondary bg-clip-text text-transparent">
                LUMINNUS
              </h3>
            </div>
            <p className="text-white/70">{t('footer_tagline')}</p>
            <div className="pt-4">
              <p className="text-sm font-semibold text-foreground mb-3">{t('footer_newsletter')}</p>
              <form onSubmit={handleNewsletter} className="flex gap-2">
                <Input
                  type="email"
                  placeholder={t('footer_email_placeholder')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-background border-primary/30"
                />
                <Button type="submit" className="bg-primary hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(106,0,255,0.4)]">→</Button>
              </form>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t('footer_contact')}</h4>
            <div className="space-y-2 text-muted-foreground">
              <p>Email: contato@luminnus.com</p>
              <p>WhatsApp: +351 911548-676</p>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">{t('footer_social')}</h4>
            <div className="flex space-x-4">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center hover:bg-primary/20 hover:shadow-[0_0_20px_rgba(106,0,255,0.4)] transition-all">
                <Linkedin className="w-6 h-6 text-primary" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-magenta/10 rounded-lg flex items-center justify-center hover:bg-magenta/20 hover:shadow-[0_0_20px_rgba(255,46,158,0.4)] transition-all">
                <Instagram className="w-6 h-6 text-magenta" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center hover:bg-secondary/20 hover:shadow-[0_0_20px_rgba(0,194,255,0.4)] transition-all">
                <Youtube className="w-6 h-6 text-secondary" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-primary/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} {t('footer_copyright')}</p>
            <div className="flex gap-6">
              <Link to="/politica-de-privacidade" className="hover:text-primary transition-colors">{t('footer_privacy')}</Link>
              <Link to="/termos-de-uso" className="hover:text-primary transition-colors">{t('footer_terms')}</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;