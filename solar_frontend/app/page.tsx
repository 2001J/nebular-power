"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
  Activity,
  BarChart,
  Battery,
  Bell,
  Check,
  ClipboardList,
  CreditCard,
  Github,
  Layout,
  Linkedin,
  Lock,
  Mail,
  Menu,
  Phone,
  Power,
  Shield,
  ShieldCheck,
  Sun,
  UserPlus,
  Users,
  Zap
} from "lucide-react"
import { useState, FormEvent } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ModeToggle } from "@/components/mode-toggle"

// Define the navy color using RGB values
const navyColor = "rgb(25, 47, 80)"
const navyColorLight = "rgba(25, 47, 80, 0.1)"
const navyColorMedium = "rgba(25, 47, 80, 0.2)"
const navyColorTransparent = "rgba(25, 47, 80, 0.8)"

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    inquiryType: "",
    message: "",
  })

  const handleLogin = () => {
    router.push("/login")
  }

  const handleRegister = () => {
    router.push("/register")
  }

  const handleDashboard = () => {
    if (user?.role === "ADMIN") {
      router.push("/admin")
    } else {
      router.push("/customer")
    }
  }

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: "smooth" })
  }

  const handleContactSubmit = (e: FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        duration: 3000,
      })
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        duration: 3000,
      })
      return
    }

    // Submit form
    console.log("Form submitted:", formData)
    toast({
      title: "Thanks for your inquiry!",
      description: "We'll get back to you soon.",
      duration: 5000,
    })

    // Clear form
    setFormData({
      name: "",
      email: "",
      inquiryType: "",
      message: "",
    })
  }

  const features = [
    {
      icon: Activity,
      title: "Real-Time Energy Monitoring",
      description: "Track energy production and consumption in real-time with detailed analytics and visualizations."
    },
    {
      icon: CreditCard,
      title: "Payment Management",
      description: "Manage installment payments, view payment history, and download receipts with ease."
    },
    {
      icon: Bell,
      title: "Tamper Detection Alerts",
      description: "Advanced security features to detect and alert any tampering attempts on your installation."
    },
    {
      icon: Layout,
      title: "User-Friendly Dashboard",
      description: "Intuitive interfaces for seamless management of your solar energy systems."
    }
  ]

  const steps = [
    {
      icon: UserPlus,
      title: "Install & Register",
      description: "Customers onboarded by the admin"
    },
    {
      icon: ClipboardList,
      title: "Monitor & Track",
      description: "Energy stats, usage, and payments visualized on dashboards"
    },
    {
      icon: Bell,
      title: "Receive Notifications",
      description: "Alerts for payments and tamper events sent instantly"
    },
    {
      icon: Shield,
      title: "Stay Compliant",
      description: "Securely manage and ensure smooth solar operations"
    }
  ]

  const adminFeatures = [
    {
      icon: Users,
      title: "User Management",
      description: "Create and manage user profiles for solar projects"
    },
    {
      icon: CreditCard,
      title: "Payment Tracking",
      description: "Automate compliance status updates based on payments"
    },
    {
      icon: Power,
      title: "System Control",
      description: "Remotely disconnect/reconnect solar systems based on payment compliance"
    },
    {
      icon: Shield,
      title: "Tamper Monitoring",
      description: "Manage and respond to security alerts efficiently"
    }
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-[#192f50]/95 dark:bg-gray-950/60 backdrop-blur-xl z-50 border-b border-[#2d4a6f]/30 dark:border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sun className="h-8 w-8 text-amber-500 dark:text-amber-400" />
              <span className="text-2xl font-bold text-white dark:text-white/90">NebulaPower</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection("home")} className="text-white/80 hover:text-white dark:text-white/60 dark:hover:text-white/90 transition-colors font-medium">
                Home
              </button>
              <button onClick={() => scrollToSection("features")} className="text-white/80 hover:text-white dark:text-white/60 dark:hover:text-white/90 transition-colors font-medium">
                Features
              </button>
              <button onClick={() => scrollToSection("how-it-works")} className="text-white/80 hover:text-white dark:text-white/60 dark:hover:text-white/90 transition-colors font-medium">
                How It Works
              </button>
              <button onClick={() => scrollToSection("contact")} className="text-white/80 hover:text-white dark:text-white/60 dark:hover:text-white/90 transition-colors font-medium">
                Contact Us
              </button>

              {user ? (
                <Button onClick={handleDashboard} className="bg-white hover:bg-white/90 text-[#192f50] shadow-sm font-semibold">Go to Dashboard</Button>
              ) : (
                <Button onClick={handleLogin} className="bg-white/10 hover:bg-white/20 text-white border border-white/30 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20 font-medium">
                  Sign In
                </Button>
              )}
              
              <ModeToggle />
            </div>

            <div className="md:hidden flex items-center gap-2">
              <ModeToggle />
              <Button variant="ghost" className="text-white hover:bg-white/10">
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <div id="home" className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        {/* Background image with better visibility */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497440001374-f26997328c1b')] bg-cover bg-center opacity-30 dark:opacity-10"></div>
        
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent dark:from-gray-950/80 dark:via-gray-950/40"></div>
        
        {/* Subtle animated rays effect */}
        <div className="absolute inset-0 opacity-20 dark:opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-32 relative z-10">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-block mb-4 px-4 py-2 bg-amber-500/20 dark:bg-amber-500/10 border border-amber-500/30 dark:border-amber-500/20 rounded-full text-amber-300 dark:text-amber-400 text-sm font-medium">
              ☀️ Powering the future with solar energy
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Solar Energy Monitoring and Management System
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-white/90 dark:text-white/70 leading-relaxed max-w-2xl mx-auto">
              Track production, manage payments, and optimize your solar energy system all in one place
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              {user ? (
                <Button
                  onClick={handleDashboard}
                  size="lg"
                  className="bg-white hover:bg-white/90 text-slate-900 text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all font-semibold"
                >
                  Go to Dashboard
                </Button>
              ) : (
                <Button
                  onClick={() => scrollToSection("contact")}
                  size="lg"
                  className="bg-white hover:bg-white/90 text-slate-900 text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all font-semibold"
                >
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <section id="features" className="py-24 bg-white dark:bg-[#0a0f1a]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-[#192f50] dark:text-white leading-tight">
              Comprehensive Solar Monitoring
            </h2>
            <p className="text-lg text-[#192f50]/70 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Our platform provides all the tools you need to monitor, manage, and maximize your solar energy investment
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group bg-white dark:bg-[#0f1419] p-8 rounded-xl shadow-sm hover:shadow-xl dark:shadow-none transition-all duration-200 border border-[#192f50]/10 dark:border-gray-800 hover:-translate-y-1"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-6 bg-[#192f50]/5 dark:bg-[#1a2332] group-hover:bg-[#192f50]/10 dark:group-hover:bg-[#1f2937] transition-colors">
                  <feature.icon className="w-5 h-5 text-[#192f50] dark:text-blue-400" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-[#192f50] dark:text-gray-100 leading-snug">{feature.title}</h3>
                <p className="text-sm text-[#192f50]/70 dark:text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works section */}
      <section id="how-it-works" className="py-24 bg-gray-50 dark:bg-[#0f1419]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-[#192f50] dark:text-white leading-tight">
              Streamlined for Efficiency
            </h2>
            <p className="text-lg text-[#192f50]/70 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Our simple four-step process ensures smooth operation of your solar energy systems
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-6 bg-[#192f50]/5 dark:bg-[#1a2332] border border-[#192f50]/10 dark:border-gray-800">
                    <step.icon className="w-7 h-7 text-[#192f50] dark:text-blue-400" strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-[#192f50] dark:text-gray-100 leading-snug">{step.title}</h3>
                  <p className="text-sm text-[#192f50]/70 dark:text-gray-400 leading-relaxed">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 left-full w-full h-0.5 -translate-y-1/2 transform bg-gradient-to-r from-[#192f50]/20 to-transparent dark:from-gray-700 dark:to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Admin Features section */}
      <section className="py-24 bg-[#192f50] dark:bg-[#0a0f1a] text-white relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.02] dark:bg-grid-white/[0.02]"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white leading-tight">
              Powerful Tools for Administrators
            </h2>
            <p className="text-lg text-white/80 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Comprehensive management tools designed for efficient solar system administration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {adminFeatures.map((feature) => (
              <div
                key={feature.title}
                className="group p-8 rounded-xl bg-white/10 dark:bg-[#0f1419] hover:bg-white/15 dark:hover:bg-[#1a2332] transition-all duration-200 border border-white/20 dark:border-gray-800 hover:-translate-y-1"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-6 bg-white/10 dark:bg-[#1a2332] group-hover:bg-white/20 dark:group-hover:bg-[#1f2937] transition-colors">
                  <feature.icon className="w-5 h-5 text-white dark:text-blue-400" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-white dark:text-gray-100 leading-snug">{feature.title}</h3>
                <p className="text-sm text-white/80 dark:text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact section */}
      <section id="contact" className="py-24 bg-white dark:bg-[#0f1419]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-[#192f50] dark:text-white leading-tight">
                Interested in Solar Energy Solutions?
              </h2>
              <p className="text-lg text-[#192f50]/70 dark:text-gray-400 leading-relaxed">
                Get in touch with us to learn more about how we can help you manage your solar energy systems
              </p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-5 bg-white dark:bg-[#0a0f1a] p-8 md:p-10 rounded-xl border border-[#192f50]/10 dark:border-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-[#192f50] dark:text-gray-300">
                    Name
                  </label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-11 rounded-lg border-[#192f50]/20 bg-white focus:border-[#192f50] dark:bg-[#0f1419] dark:border-gray-700 dark:focus:border-blue-500 dark:text-gray-100 dark:placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-[#192f50] dark:text-gray-300">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-11 rounded-lg border-[#192f50]/20 bg-white focus:border-[#192f50] dark:bg-[#0f1419] dark:border-gray-700 dark:focus:border-blue-500 dark:text-gray-100 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="type" className="text-sm font-medium text-[#192f50] dark:text-gray-300">
                  Inquiry Type
                </label>
                <Select
                  value={formData.inquiryType}
                  onValueChange={(value) => setFormData({ ...formData, inquiryType: value })}
                >
                  <SelectTrigger className="h-11 rounded-lg border-[#192f50]/20 bg-white focus:border-[#192f50] dark:bg-[#0f1419] dark:border-gray-700 dark:focus:border-blue-500 dark:text-gray-100">
                    <SelectValue placeholder="Select inquiry type" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-[#0f1419] dark:border-gray-700">
                    <SelectItem value="residential" className="dark:text-gray-100 dark:focus:bg-[#1a2332] dark:focus:text-white">Residential</SelectItem>
                    <SelectItem value="commercial" className="dark:text-gray-100 dark:focus:bg-[#1a2332] dark:focus:text-white">Commercial</SelectItem>
                    <SelectItem value="other" className="dark:text-gray-100 dark:focus:bg-[#1a2332] dark:focus:text-white">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-[#192f50] dark:text-gray-300">
                  Message
                </label>
                <Textarea
                  id="message"
                  placeholder="Tell us about your needs..."
                  className="min-h-[140px] rounded-lg border-[#192f50]/20 bg-white focus:border-[#192f50] dark:bg-[#0f1419] dark:border-gray-700 dark:focus:border-blue-500 dark:text-gray-100 dark:placeholder:text-gray-500 resize-none"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" className="w-full h-11 text-base font-medium bg-[#192f50] hover:bg-[#192f50]/90 dark:bg-blue-400 dark:hover:bg-blue-500 text-white rounded-lg">
                Submit Inquiry
              </Button>
            </form>

            <div className="mt-12 text-center space-y-2">
              <p className="text-base text-[#192f50]/70 dark:text-gray-400">Email: info@nebulapower.com</p>
              <p className="text-base text-[#192f50]/70 dark:text-gray-400">Phone: +1 (555) 123-4567</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#192f50] dark:bg-gray-950 text-white py-16 border-t border-[#2d4a6f]/50 dark:border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Sun className="h-6 w-6 text-amber-500 dark:text-amber-400" />
                <span className="text-xl font-bold dark:text-white/90">NebulaPower</span>
              </div>
              <p className="text-gray-400 dark:text-white/50 leading-relaxed">
                Affordable solar energy solutions with advanced monitoring and management
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 dark:text-white/90">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() => scrollToSection("home")}
                    className="text-gray-400 dark:text-white/50 hover:text-white dark:hover:text-white/90 transition-colors"
                  >
                    Home
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("features")}
                    className="text-gray-400 dark:text-white/50 hover:text-white dark:hover:text-white/90 transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("how-it-works")}
                    className="text-gray-400 dark:text-white/50 hover:text-white dark:hover:text-white/90 transition-colors"
                  >
                    How It Works
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("contact")}
                    className="text-gray-400 dark:text-white/50 hover:text-white dark:hover:text-white/90 transition-colors"
                  >
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 dark:text-white/90">Legal</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-gray-400 dark:text-white/50 hover:text-white dark:hover:text-white/90 transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 dark:text-white/50 hover:text-white dark:hover:text-white/90 transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 dark:text-white/90">Contact</h4>
              <div className="space-y-3">
                <a
                  href="mailto:info@nebulapower.com"
                  className="flex items-center text-gray-400 dark:text-white/50 hover:text-white dark:hover:text-white/90 transition-colors group"
                >
                  <Mail className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  info@nebulapower.com
                </a>
                <a
                  href="tel:+15551234567"
                  className="flex items-center text-gray-400 dark:text-white/50 hover:text-white dark:hover:text-white/90 transition-colors group"
                >
                  <Phone className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  +1 (555) 123-4567
                </a>
              </div>
              <div className="flex space-x-4 mt-6">
                <a
                  href="#"
                  className="text-gray-400 dark:text-white/50 hover:text-white dark:hover:text-white/90 transition-all hover:scale-110"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-6 h-6" />
                </a>
              
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 dark:border-white/10 mt-12 pt-8 text-center text-gray-500 dark:text-white/40">
            <p>&copy; {new Date().getFullYear()} NebulaPower. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

