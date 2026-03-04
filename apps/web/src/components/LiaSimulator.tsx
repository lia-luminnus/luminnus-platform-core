import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface FormData {
  businessType: string;
  employees: string;
  weeklyHours: string;
}

interface Results {
  timeSaved: number;
  costReduction: number;
  productivityIncrease: number;
}

const LiaSimulator = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<FormData>({
    businessType: "Profissional Autônomo",
    employees: "1 pessoa",
    weeklyHours: "Até 10h",
  });
  const [results, setResults] = useState<Results | null>(null);
  const [showResults, setShowResults] = useState(false);

  const calculateResults = () => {
    const businessMultiplier: Record<string, { mult: number; hourValue: number }> = {
      "Profissional Autônomo": { mult: 1, hourValue: 15 },
      "Pequena Empresa": { mult: 1.2, hourValue: 18 },
      "Média Empresa": { mult: 1.5, hourValue: 22 },
      "Grande Empresa": { mult: 2, hourValue: 25 },
    };

    const employeeMultiplier: Record<string, number> = {
      "1 pessoa": 1,
      "2 a 5 pessoas": 1.3,
      "6 a 15 pessoas": 1.6,
      "Mais de 15 pessoas": 2,
    };

    const hoursBase: Record<string, number> = {
      "Até 10h": 8,
      "Entre 10h e 30h": 20,
      "Mais de 30h": 35,
    };

    const business = businessMultiplier[formData.businessType];
    const empMult = employeeMultiplier[formData.employees];
    const hours = hoursBase[formData.weeklyHours];

    const timeSaved = Math.round(hours * 0.7 * empMult);
    const costReduction = Math.round(timeSaved * 4 * business.hourValue * business.mult);
    const productivityIncrease = Math.min(85, Math.round(30 + empMult * 10 + hours / 5));

    setResults({ timeSaved, costReduction, productivityIncrease });
    setShowResults(true);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden bg-[#0B0B0F]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#000000] via-[#7C3AED]/5 to-[#0B0B0F]" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-12 animate-fade-in">
            <h2 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-[#7C3AED] via-[#FF2E9E] to-[#22D3EE] bg-clip-text text-transparent">
              {t('sim_title')}
            </h2>
            <p className="text-lg lg:text-xl text-white/70">
              {t('sim_subtitle')}
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(124,58,237,0.2)] p-8 lg:p-10">
            <form className="space-y-6 mb-10" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('sim_label_biz')}
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => handleInputChange("businessType", e.target.value)}
                  className="w-full bg-[#1C1C1C] text-white p-4 rounded-lg border border-[#22D3EE]/20 focus:border-[#22D3EE]/50 focus:ring-2 focus:ring-[#22D3EE]/20 transition-all outline-none"
                >
                  <option value="Profissional Autônomo">{t('sim_opt_biz1')}</option>
                  <option value="Pequena Empresa">{t('sim_opt_biz2')}</option>
                  <option value="Média Empresa">{t('sim_opt_biz3')}</option>
                  <option value="Grande Empresa">{t('sim_opt_biz4')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('sim_label_emp')}
                </label>
                <select
                  value={formData.employees}
                  onChange={(e) => handleInputChange("employees", e.target.value)}
                  className="w-full bg-[#1C1C1C] text-white p-4 rounded-lg border border-[#22D3EE]/20 focus:border-[#22D3EE]/50 focus:ring-2 focus:ring-[#22D3EE]/20 transition-all outline-none"
                >
                  <option value="1 pessoa">{t('sim_opt_emp1')}</option>
                  <option value="2 a 5 pessoas">{t('sim_opt_emp2')}</option>
                  <option value="6 a 15 pessoas">{t('sim_opt_emp3')}</option>
                  <option value="Mais de 15 pessoas">{t('sim_opt_emp4')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  {t('sim_label_hours')}
                </label>
                <select
                  value={formData.weeklyHours}
                  onChange={(e) => handleInputChange("weeklyHours", e.target.value)}
                  className="w-full bg-[#1C1C1C] text-white p-4 rounded-lg border border-[#22D3EE]/20 focus:border-[#22D3EE]/50 focus:ring-2 focus:ring-[#22D3EE]/20 transition-all outline-none"
                >
                  <option value="Até 10h">{t('sim_opt_hours1')}</option>
                  <option value="Entre 10h e 30h">{t('sim_opt_hours2')}</option>
                  <option value="Mais de 30h">{t('sim_opt_hours3')}</option>
                </select>
              </div>

              <Button
                type="button"
                onClick={calculateResults}
                className="w-full bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] py-6 text-lg font-semibold border-0 transition-all hover:scale-[1.02]"
              >
                {t('sim_btn_calc')}
              </Button>
            </form>

            {showResults && results && (
              <div className="animate-fade-in">
                <div className="text-center mb-8">
                  <h3 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#22D3EE] to-[#7C3AED] bg-clip-text text-transparent mb-2">
                    {t('sim_res_title')}
                  </h3>
                  <p className="text-white/60">
                    {t('sim_res_subtitle')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-[#0E0E13] p-6 rounded-xl border border-[#22D3EE]/20 shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] transition-all">
                    <svg width="50" height="50" className="mx-auto mb-3">
                      <circle cx="25" cy="25" r="22" stroke="#22D3EE" strokeWidth="3" fill="none" />
                    </svg>
                    <h4 className="text-[#22D3EE] text-xl lg:text-2xl font-bold text-center">
                      +{results.timeSaved}{t('sim_res_time')}
                    </h4>
                    <p className="text-white/60 text-sm text-center mt-2">{t('sim_res_time_label')}</p>
                  </div>

                  <div className="bg-[#0E0E13] p-6 rounded-xl border border-[#22D3EE]/20 shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] transition-all">
                    <svg width="50" height="50" className="mx-auto mb-3">
                      <rect x="10" y="10" width="30" height="30" rx="6" stroke="#22D3EE" strokeWidth="3" fill="none" />
                    </svg>
                    <h4 className="text-[#22D3EE] text-xl lg:text-2xl font-bold text-center">
                      €{results.costReduction}{t('sim_res_cost')}
                    </h4>
                    <p className="text-white/60 text-sm text-center mt-2">{t('sim_res_cost_label')}</p>
                  </div>

                  <div className="bg-[#0E0E13] p-6 rounded-xl border border-[#22D3EE]/20 shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] transition-all">
                    <svg width="50" height="50" className="mx-auto mb-3">
                      <polygon points="25,5 45,45 5,45" stroke="#22D3EE" strokeWidth="3" fill="none" />
                    </svg>
                    <h4 className="text-[#22D3EE] text-xl lg:text-2xl font-bold text-center">
                      +{results.productivityIncrease}%
                    </h4>
                    <p className="text-white/60 text-sm text-center mt-2">{t('sim_res_prod_label')}</p>
                  </div>
                </div>

                <Link to="/planos">
                  <Button className="w-full bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] py-6 text-lg font-semibold border-0 transition-all hover:scale-[1.02]">
                    {t('sim_btn_plans')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiaSimulator;
