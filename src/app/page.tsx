'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { 
  Moon, Sun, Menu, X, Check, ChevronDown, 
  Zap, Shield, TrendingUp, Users, MessageSquare, 
  CreditCard, BarChart3, Clock, Smartphone, Laptop,
  ArrowRight, Star, CheckCircle2, Loader2
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  is_trial: boolean;
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      console.log('🔍 Buscando planos da API...');
      const response = await fetch('/api/public-plans');
      console.log('📥 Resposta:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Dados recebidos:', data);
        
        if (data.plans && data.plans.length > 0) {
          console.log('✅ Usando planos da API:', data.plans.length);
          setPlans(data.plans);
        } else {
          console.log('⚠️ Nenhum plano retornado, usando fallback');
          // Fallback: usar planos padrão se API não retornar dados
          setPlans([
            {
              id: 'plan_trial',
              name: 'Trial 3 Dias',
              description: 'Teste sem compromisso',
              price: 0,
              duration_days: 3,
              is_trial: true
            },
            {
              id: 'plan_monthly',
              name: 'Plano Mensal',
              description: 'Ideal para começar',
              price: 39.90,
              duration_days: 30,
              is_trial: false
            },
            {
              id: 'plan_semester',
              name: 'Plano Semestral',
              description: 'Economia de 16%',
              price: 200.90,
              duration_days: 180,
              is_trial: false
            },
            {
              id: 'plan_annual',
              name: 'Plano Anual',
              description: 'Melhor custo-benefício',
              price: 380.90,
              duration_days: 365,
              is_trial: false
            }
          ]);
        }
      } else {
        console.log('❌ Resposta não OK, usando fallback');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar planos:', error);
      // Fallback em caso de erro
      setPlans([
        {
          id: 'plan_trial',
          name: 'Trial 3 Dias',
          description: 'Teste sem compromisso',
          price: 0,
          duration_days: 3,
          is_trial: true
        },
        {
          id: 'plan_monthly',
          name: 'Plano Mensal',
          description: 'Ideal para começar',
          price: 39.90,
          duration_days: 30,
          is_trial: false
        },
        {
          id: 'plan_semester',
          name: 'Plano Semestral',
          description: 'Economia de 16%',
          price: 200.90,
          duration_days: 180,
          is_trial: false
        },
        {
          id: 'plan_annual',
          name: 'Plano Anual',
          description: 'Melhor custo-benefício',
          price: 380.90,
          duration_days: 365,
          is_trial: false
        }
      ]);
    } finally {
      setPlansLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-effect border-b border-border/40 bg-background/80">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                UltraGestor
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">
                Recursos
              </a>
              <a href="#plans" className="text-sm font-medium hover:text-primary transition-colors">
                Planos
              </a>
              <a href="#faq" className="text-sm font-medium hover:text-primary transition-colors">
                FAQ
              </a>
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </button>
              )}
              <Link
                href="/login"
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium hover:opacity-90 transition-opacity"
              >
                Login
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-3 animate-fade-in">
              <a
                href="#features"
                className="block px-4 py-2 rounded-lg hover:bg-accent/10 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Recursos
              </a>
              <a
                href="#plans"
                className="block px-4 py-2 rounded-lg hover:bg-accent/10 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Planos
              </a>
              <a
                href="#faq"
                className="block px-4 py-2 rounded-lg hover:bg-accent/10 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </a>
              <Link
                href="/login"
                className="block px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium text-center"
              >
                Login
              </Link>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Sistema completo de gestão
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              Gerencie sua revenda com
              <span className="block mt-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                inteligência e automação
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Automatize cobranças, envie lembretes via WhatsApp e controle pagamentos PIX. 
              Tudo que você precisa para escalar seu negócio em uma única plataforma.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 group"
              >
                <span>Começar agora</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#features"
                className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-primary/20 hover:border-primary/40 font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <span>Ver recursos</span>
                <ChevronDown className="w-5 h-5" />
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 max-w-4xl mx-auto">
              {[
                { label: 'Automação', value: '100%' },
                { label: 'Uptime', value: '99.9%' },
                { label: 'Suporte', value: '24/7' },
                { label: 'Satisfação', value: '5★' },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border">
                  <div className="text-2xl sm:text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Recursos que fazem a diferença
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ferramentas profissionais para você focar no crescimento enquanto automatizamos o operacional
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MessageSquare,
                title: 'WhatsApp Automático',
                description: 'Lembretes de vencimento enviados automaticamente. Configure uma vez e esqueça.',
                gradient: 'from-green-500 to-emerald-500'
              },
              {
                icon: CreditCard,
                title: 'Pagamentos PIX',
                description: 'Integração com Mercado Pago e Asaas. QR Code gerado automaticamente.',
                gradient: 'from-blue-500 to-cyan-500'
              },
              {
                icon: Users,
                title: 'Gestão de Clientes',
                description: 'Controle completo de clientes, planos e vencimentos em um só lugar.',
                gradient: 'from-purple-500 to-pink-500'
              },
              {
                icon: BarChart3,
                title: 'Dashboard Inteligente',
                description: 'Métricas em tempo real para decisões baseadas em dados.',
                gradient: 'from-orange-500 to-red-500'
              },
              {
                icon: Shield,
                title: 'Segurança Total',
                description: 'Criptografia de ponta a ponta e backups automáticos diários.',
                gradient: 'from-indigo-500 to-purple-500'
              },
              {
                icon: TrendingUp,
                title: 'Escalável',
                description: 'Cresce com seu negócio. De 10 a 10.000 clientes sem problemas.',
                gradient: 'from-teal-500 to-green-500'
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/10 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Como funciona
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Em poucos passos você está pronto para automatizar sua gestão
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Cadastre seus clientes',
                description: 'Importe ou adicione manualmente. Defina planos, valores e vencimentos.',
                icon: Users
              },
              {
                step: '02',
                title: 'Configure automações',
                description: 'Ative lembretes WhatsApp e pagamentos PIX. Personalize mensagens.',
                icon: Zap
              },
              {
                step: '03',
                title: 'Acompanhe resultados',
                description: 'Veja métricas em tempo real e receba pagamentos automaticamente.',
                icon: BarChart3
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent -z-10" />
                )}
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent text-white text-2xl font-bold">
                    {item.step}
                  </div>
                  <div className="flex justify-center">
                    <item.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="plans" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Teste grátis de 3 dias - Sem cartão de crédito
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Planos que cabem no seu bolso
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comece com 3 dias grátis e escolha o plano ideal depois
            </p>
          </div>

          {plansLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className={`grid gap-8 ${plans.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : plans.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              {plans.map((plan, i) => {
                const isTrial = plan.is_trial;
                const isPopular = !isTrial && plan.duration_days === 30; // Mensal é o mais popular
                
                // Calcular preço por mês para planos longos
                const pricePerMonth = plan.duration_days > 30 
                  ? (plan.price / (plan.duration_days / 30)).toFixed(2)
                  : null;

                // Definir features baseado no tipo de plano
                const features = isTrial
                  ? [
                      'Acesso completo',
                      'Todos os recursos',
                      'WhatsApp automático',
                      'Pagamentos PIX',
                      'Dashboard completo',
                      'Sem cartão de crédito'
                    ]
                  : [
                      'Acesso completo',
                      'Clientes ilimitados',
                      'WhatsApp automático',
                      'Pagamentos PIX',
                      'Dashboard completo',
                      'Suporte prioritário',
                      ...(pricePerMonth ? [`R$ ${pricePerMonth}/mês`] : [])
                    ];

                return (
                  <div
                    key={plan.id}
                    className={`relative p-8 rounded-2xl border-2 transition-all hover:shadow-xl ${
                      isTrial
                        ? 'border-green-500 bg-gradient-to-br from-green-500/5 to-emerald-500/5 shadow-lg'
                        : isPopular
                        ? 'border-primary bg-gradient-to-br from-primary/5 to-accent/5 shadow-lg scale-105'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    {isTrial && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold">
                        Teste Grátis
                      </div>
                    )}
                    {isPopular && !isTrial && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold">
                        Mais Popular
                      </div>
                    )}
                    
                    <div className="text-center space-y-4 mb-8">
                      <h3 className="text-2xl font-bold">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold">
                            {isTrial ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
                          </span>
                          {!isTrial && (
                            <span className="text-muted-foreground ml-1">
                              {plan.duration_days === 30 ? '/mês' : 
                               plan.duration_days === 180 ? '/semestre' : 
                               plan.duration_days === 365 ? '/ano' : ''}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {plan.duration_days} dias
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {features.map((feature, j) => (
                        <li key={j} className="flex items-start space-x-3">
                          <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            isTrial ? 'text-green-600 dark:text-green-400' : 'text-primary'
                          }`} />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/register"
                      className={`block w-full py-3 rounded-xl font-semibold text-center transition-all ${
                        isTrial
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90'
                          : isPopular
                          ? 'bg-gradient-to-r from-primary to-accent text-white hover:opacity-90'
                          : 'border-2 border-primary/20 hover:border-primary/40'
                      }`}
                    >
                      {isTrial ? 'Começar teste grátis' : 'Assinar agora'}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Perguntas frequentes
            </h2>
            <p className="text-lg text-muted-foreground">
              Tudo que você precisa saber sobre o UltraGestor
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                question: 'O que é o UltraGestor?',
                answer: 'O UltraGestor é uma plataforma completa de gestão para revendas. Automatizamos cobranças, lembretes via WhatsApp, pagamentos PIX e muito mais, permitindo que você foque no crescimento do seu negócio.'
              },
              {
                question: 'Vocês fornecem conteúdo IPTV?',
                answer: 'Não! O UltraGestor é apenas uma ferramenta de gestão. Não fornecemos, hospedamos ou distribuímos qualquer tipo de conteúdo IPTV. Somos uma plataforma administrativa para você gerenciar seu próprio negócio.'
              },
              {
                question: 'Como funciona a automação de WhatsApp?',
                answer: 'Você configura os templates de mensagem uma única vez. O sistema envia automaticamente lembretes de vencimento (7 dias antes, 3 dias antes, no dia, após vencimento) e confirmações de pagamento. Tudo sem você precisar fazer nada.'
              },
              {
                question: 'Quais métodos de pagamento são aceitos?',
                answer: 'Integramos com Mercado Pago e Asaas para pagamentos PIX automáticos. Seus clientes recebem QR Code e o sistema confirma pagamentos automaticamente via webhook.'
              },
              {
                question: 'Posso testar antes de assinar?',
                answer: 'Sim! Oferecemos 3 dias de teste totalmente grátis, sem precisar cadastrar cartão de crédito. Você tem acesso completo a todos os recursos da plataforma durante o período de trial.'
              },
              {
                question: 'Como funciona o suporte?',
                answer: 'Oferecemos suporte via email em todos os planos. Planos Professional e Enterprise têm suporte prioritário, e o Enterprise conta com suporte 24/7.'
              },
              {
                question: 'Posso cancelar a qualquer momento?',
                answer: 'Sim! Não há fidelidade. Você pode cancelar sua assinatura quando quiser e seus dados ficam disponíveis por 30 dias caso queira retornar.'
              },
              {
                question: 'Meus dados estão seguros?',
                answer: 'Absolutamente! Utilizamos criptografia de ponta a ponta, backups automáticos diários e seguimos as melhores práticas de segurança da indústria.'
              },
              {
                question: 'O que acontece após o período de teste?',
                answer: 'Após os 3 dias de teste, você pode escolher um dos nossos planos pagos para continuar usando. Seus dados e configurações são mantidos, basta renovar o acesso.'
              },
              {
                question: 'Posso mudar de plano depois?',
                answer: 'Sim! Você pode renovar com qualquer plano disponível a qualquer momento. O tempo é adicionado ao seu período atual, então você nunca perde dias pagos.'
              },
            ].map((faq, i) => (
              <details
                key={i}
                className="group p-6 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-semibold text-lg">{faq.question}</span>
                  <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary via-accent to-primary">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Pronto para transformar sua gestão?
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Comece agora com 3 dias grátis. Sem cartão de crédito, sem compromisso.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-primary font-semibold hover:bg-white/90 transition-colors flex items-center justify-center space-x-2"
            >
              <span>Começar teste grátis de 3 dias</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-white text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold">UltraGestor</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Gestão profissional para revendas modernas
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-primary transition-colors">Recursos</a></li>
                <li><a href="#plans" className="hover:text-primary transition-colors">Planos</a></li>
                <li><a href="#faq" className="hover:text-primary transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Suporte</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Termos</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2025 UltraGestor. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
