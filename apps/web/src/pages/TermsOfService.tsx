import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      <Header />
      <section className="pt-28 lg:pt-32 pb-16 px-6 lg:px-20 bg-background text-foreground min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-6">Termos de Uso – Luminnus AI</h1>
        <p className="mb-4 text-muted-foreground">
          Bem-vindo(a) à Luminnus. Ao acessar e utilizar nossos serviços, você concorda com os termos descritos abaixo.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">1. Aceitação dos Termos</h2>
        <p className="mb-4 text-muted-foreground">
          O uso deste site e das soluções da Luminnus implica a aceitação integral destes Termos de Uso. Caso não concorde, não utilize nossos serviços.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">2. Serviços Oferecidos</h2>
        <p className="mb-4 text-muted-foreground">
          A Luminnus oferece consultoria, automação e soluções baseadas em inteligência artificial, incluindo assistentes virtuais personalizados e integração com sistemas empresariais.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">3. Responsabilidade do Usuário</h2>
        <ul className="list-disc ml-6 mb-4 text-muted-foreground">
          <li>Fornecer informações verdadeiras;</li>
          <li>Manter confidenciais suas credenciais de acesso;</li>
          <li>Não utilizar os serviços para fins ilícitos ou ofensivos;</li>
          <li>Não reproduzir conteúdos sem autorização.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">4. Limitação de Responsabilidade</h2>
        <p className="mb-4 text-muted-foreground">
          A Luminnus não se responsabiliza por decisões tomadas com base em informações geradas pela IA. O uso das soluções é de responsabilidade do usuário.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">5. Propriedade Intelectual</h2>
        <p className="mb-4 text-muted-foreground">
          Todos os conteúdos, marcas e designs são propriedade exclusiva da Luminnus. É proibida a reprodução sem autorização prévia.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">6. Cancelamento e Encerramento</h2>
        <p className="mb-4 text-muted-foreground">
          A Luminnus reserva-se o direito de suspender ou encerrar contas que violem estes Termos.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">7. Alterações</h2>
        <p className="mb-4 text-muted-foreground">
          Estes Termos podem ser atualizados a qualquer momento, com aviso publicado no site.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">8. Contato</h2>
        <p className="mb-4 text-muted-foreground">
          Dúvidas e solicitações:{" "}
          <a href="mailto:contato@luminnus.com" className="text-primary font-medium hover:underline">
            contato@luminnus.com
          </a>
          .
        </p>

        <p className="mt-8 font-medium text-foreground">Luminnus AI — Inteligência que inspira, ensina e transforma.</p>
      </div>
    </section>
      <Footer />
    </div>
  );
};

export default TermsOfService;
