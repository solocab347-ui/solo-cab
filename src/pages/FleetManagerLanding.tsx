import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { NavigationHeader } from "@/components/NavigationHeader";
import {
  Truck,
  Users,
  Car,
  QrCode,
  Calendar,
  BarChart3,
  Shield,
  Star,
  ArrowRight,
  Check,
  Smartphone,
  Globe,
  CreditCard,
  MessageSquare,
  FileText,
  Zap,
} from "lucide-react";
import logo from "@/assets/logo-solocab.png";

const FleetManagerLanding = () => {
  const features = [
    {
      icon: Users,
      title: "Independent Drivers Management",
      description: "Register and manage drivers who own their vehicles. Assign rides and track performance.",
    },
    {
      icon: Car,
      title: "Company Vehicle Fleet",
      description: "Also manage drivers using company-provided vehicles. Full fleet control.",
    },
    {
      icon: Calendar,
      title: "Centralized Planning",
      description: "View and manage all driver schedules from one dashboard. Optimize ride assignments.",
    },
    {
      icon: QrCode,
      title: "Unique QR Code",
      description: "Your personal QR code for clients to scan, view all your drivers, and book directly.",
    },
    {
      icon: Globe,
      title: "Public Profile Page",
      description: "Showcase your fleet with a public profile. Attract new clients with promotions.",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Track revenue, rides, and driver performance with detailed analytics.",
    },
  ];

  const driverTypes = [
    {
      title: "Independent Drivers",
      subtitle: "Own Vehicle",
      description: "Work with self-employed drivers who own their vehicles. You provide the rides, they provide the service.",
      features: [
        "Drivers keep their own car",
        "Flexible working hours",
        "Commission-based earnings",
        "Full driver autonomy",
      ],
      icon: Car,
      popular: true,
    },
    {
      title: "Company Fleet Drivers",
      subtitle: "Company Vehicle",
      description: "Employ drivers using your company vehicles. Full control over fleet and operations.",
      features: [
        "Company-provided vehicles",
        "Scheduled working hours",
        "Fixed or salary-based pay",
        "Complete fleet control",
      ],
      icon: Truck,
      popular: false,
    },
  ];

  const clientFeatures = [
    {
      icon: QrCode,
      title: "Easy Client Registration",
      description: "Clients scan your QR code to register and see all available drivers.",
    },
    {
      icon: Smartphone,
      title: "Mobile Booking",
      description: "Clients book rides directly from their phone with any of your drivers.",
    },
    {
      icon: MessageSquare,
      title: "Direct Communication",
      description: "Built-in messaging between clients and drivers for seamless coordination.",
    },
    {
      icon: FileText,
      title: "Automatic Invoicing",
      description: "Generate quotes and invoices automatically for all client bookings.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              <Truck className="w-4 h-4 mr-2" />
              Fleet Management Platform
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Manage Your VTC Fleet
              <span className="block text-primary">Like Never Before</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Whether you work with independent drivers or manage a company fleet, 
              SoloCab gives you the tools to grow your transportation business.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register-fleet">
                <Button size="lg" className="text-lg px-8">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Already Registered? Login
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>7-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Driver Types Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Choose Your Fleet Model</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              SoloCab supports both independent drivers with their own vehicles 
              and company-employed drivers using fleet vehicles.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {driverTypes.map((type, index) => (
              <Card 
                key={index} 
                className={`relative overflow-hidden ${type.popular ? 'border-primary shadow-lg' : ''}`}
              >
                {type.popular && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <type.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{type.title}</CardTitle>
                      <CardDescription className="text-base">{type.subtitle}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground">{type.description}</p>
                  <ul className="space-y-3">
                    {type.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need to Manage Your Fleet</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed specifically for VTC fleet managers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Client Features */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Users className="w-4 h-4 mr-2" />
              Client Management
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Attract and Manage Clients Easily</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your clients can register via your unique QR code, view all available drivers, 
              and book rides directly.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {clientFeatures.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Public Profile Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">
                <Globe className="w-4 h-4 mr-2" />
                Public Profile
              </Badge>
              <h2 className="text-3xl font-bold mb-4">
                Your Own Public Storefront
              </h2>
              <p className="text-muted-foreground mb-6">
                Get a beautiful public profile page to showcase your fleet. Share it on social media, 
                print QR codes, and let new clients discover all your drivers.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Display all your drivers and vehicles</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Offer promotions and discounts</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Unique QR code for easy access</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>Clients book directly with any driver</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 flex items-center justify-center">
              <div className="text-center">
                <QrCode className="w-32 h-32 mx-auto mb-4 text-primary" />
                <p className="font-semibold text-lg">Your Unique QR Code</p>
                <p className="text-sm text-muted-foreground">Scan to view all drivers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Grow Your VTC Business?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join SoloCab today and start managing your drivers and clients 
            with the most powerful fleet management platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register-fleet">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                <Zap className="w-5 h-5 mr-2" />
                Start Free Trial
              </Button>
            </Link>
            <Link to="/chauffeurs">
              <Button size="lg" variant="outline" className="text-lg px-8 border-primary-foreground/30 hover:bg-primary-foreground/10">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="SoloCab" className="h-8" />
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SoloCab. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FleetManagerLanding;
