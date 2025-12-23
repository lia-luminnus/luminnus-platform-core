import UnifiedHeader from "@/components/UnifiedHeader";
import Hero from "@/components/Hero";
import AboutLuminnus from "@/components/AboutLuminnus";
import LiaStatistics from "@/components/LiaStatistics";
import LiaPositioning from "@/components/LiaPositioning";
import LiaAtendimento from "@/components/LiaAtendimento";
import LiaSimulator from "@/components/LiaSimulator";
import Solutions from "@/components/Solutions";
import FuturePersonas from "@/components/FuturePersonas";
import Footer from "@/components/Footer";
import FloatingChatButton from "@/components/FloatingChatButton";

const Index = () => {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <UnifiedHeader />
      <Hero />
      <AboutLuminnus />
      <LiaStatistics />
      <LiaPositioning />
      <LiaAtendimento />
      <LiaSimulator />
      <Solutions />
      <FuturePersonas />
      <Footer />
      <FloatingChatButton />
    </div>
  );
};

export default Index;
