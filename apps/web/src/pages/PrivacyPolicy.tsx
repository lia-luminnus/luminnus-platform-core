import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      <Header />
      <section className="pt-28 lg:pt-32 pb-16 px-6 lg:px-20 bg-background text-foreground min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-6">Política de Privacidade – Luminnus AI</h1>
        <p className="mb-4 text-muted-foreground">
          A Luminnus valoriza a privacidade e a segurança dos seus usuários. Esta Política descreve como coletamos, usamos e protegemos suas informações pessoais durante o uso de nossos serviços, plataformas e assistentes virtuais, incluindo a Lia.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">1. Coleta de Informações</h2>
        <p className="mb-4 text-muted-foreground">
          Coletamos informações fornecidas voluntariamente, como nome, e-mail, telefone e dados de empresa, bem como dados gerados automaticamente durante o uso (cookies, IP, logs e interações com a IA).
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">2. Uso das Informações</h2>
        <ul className="list-disc ml-6 mb-4 text-muted-foreground">
          <li>Personalizar sua experiência e melhorar nossos serviços;</li>
          <li>Fornecer suporte técnico e atendimento automatizado via Lia;</li>
          <li>Enviar comunicações e ofertas relevantes;</li>
          <li>Cumprir obrigações legais e contratuais.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">3. Armazenamento e Segurança</h2>
        <p className="mb-4 text-muted-foreground">
          Seus dados são protegidos com criptografia e autenticação segura. Seguimos rigorosamente a <strong className="text-foreground">LGPD</strong> (Lei nº 13.709/2018) e o <strong className="text-foreground">GDPR</strong> europeu.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">4. Compartilhamento de Dados</h2>
        <p className="mb-4 text-muted-foreground">
          Não vendemos informações pessoais. Compartilhamos apenas com parceiros tecnológicos quando necessário para o funcionamento dos serviços.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">5. Interações com a IA (Lia)</h2>
        <p className="mb-4 text-muted-foreground">
          As conversas com a Lia podem ser registradas para aprendizado contínuo, mas nunca são compartilhadas sem consentimento.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">6. Direitos do Usuário</h2>
        <p className="mb-4 text-muted-foreground">
          Você pode solicitar acesso, correção ou exclusão de dados, além de revogar consentimentos. Contato:{" "}
          <a href="mailto:contato@luminnus.com" className="text-primary font-medium hover:underline">
            contato@luminnus.com
          </a>
          .
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">7. Cookies</h2>
        <p className="mb-4 text-muted-foreground">
          Usamos cookies para melhorar sua experiência. Você pode ajustar as permissões no seu navegador.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">8. Atualizações</h2>
        <p className="text-muted-foreground">
          Esta Política pode ser alterada periodicamente. A versão mais recente estará sempre disponível em{" "}
          <a href="/politica-de-privacidade" className="text-primary font-medium hover:underline">
            luminnus.com/politica-de-privacidade
          </a>
          .
        </p>

        <p className="mt-8 font-medium text-foreground">Luminnus AI — Tornando a tecnologia mais humana.</p>
      </div>
    </section>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
