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
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sun className="h-8 w-8 text-amber-500" />
              <span className="text-2xl font-bold" style={{ color: navyColor }}>NebulaPower</span>
            </div>

            <div className="hidden md:flex items-center space-x-6">
              <button onClick={() => scrollToSection("home")} className="text-gray-600 hover:text-gray-900">
                Home
              </button>
              <button onClick={() => scrollToSection("features")} className="text-gray-600 hover:text-gray-900">
                Features
              </button>
              <button onClick={() => scrollToSection("how-it-works")} className="text-gray-600 hover:text-gray-900">
                How It Works
              </button>
              <button onClick={() => scrollToSection("contact")} className="text-gray-600 hover:text-gray-900">
                Contact Us
              </button>

              {user ? (
                <Button onClick={handleDashboard} style={{ backgroundColor: navyColor }}>Go to Dashboard</Button>
              ) : (
                <Button variant="outline" onClick={handleLogin} style={{ borderColor: navyColor, color: navyColor }}>
                  Sign In
                </Button>
              )}
            </div>

            <Button variant="ghost" className="md:hidden">
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <div id="home" className="relative min-h-screen flex items-center justify-center bg-gradient-to-br" style={{ backgroundImage: `linear-gradient(to bottom right, rgba(25, 47, 80, 0.9), rgb(25, 47, 80))` }}>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497440001374-f26997328c1b')] bg-cover bg-center mix-blend-overlay"></div>

        <div className="container mx-auto px-4 py-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-up [--animate-delay:200ms]">
              Solar Energy Monitoring and Management System
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90 animate-fade-up [--animate-delay:400ms]">
              Track production, manage payments, and optimize your solar energy system all in one place
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center animate-fade-up [--animate-delay:600ms]">
              {user ? (
                <Button
                  onClick={handleDashboard}
                  className="bg-white hover:bg-white/90 text-lg px-8 py-6"
                  style={{ color: navyColor }}
                >
                  Go to Dashboard
                </Button>
              ) : (
                <Button
                  onClick={() => scrollToSection("contact")}
                  className="bg-white hover:bg-white/90 text-lg px-8 py-6"
                  style={{ color: navyColor }}
                >
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: navyColor }}>
              Comprehensive Solar Monitoring
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our platform provides all the tools you need to monitor, manage, and maximize your solar energy investment
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: navyColorLight }}>
                  <feature.icon className="w-6 h-6" style={{ color: navyColor }} />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: navyColor }}>{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: navyColor }}>
              Streamlined for Efficiency
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our simple four-step process ensures smooth operation of your solar energy systems
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: navyColorLight }}>
                    <step.icon className="w-8 h-8" style={{ color: navyColor }} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: navyColor }}>{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 left-full w-full h-0.5 -translate-y-1/2 transform"
                    style={{ backgroundColor: navyColorMedium }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Admin Features section */}
      <section className="py-20 text-white" style={{ backgroundColor: navyColor }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Tools for Administrators
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto">
              Comprehensive management tools designed for efficient solar system administration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {adminFeatures.map((feature) => (
              <div
                key={feature.title}
                className="backdrop-blur-lg p-6 rounded-lg hover:bg-white/20 transition-colors duration-300"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/80">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: navyColor }}>
                Interested in Solar Energy Solutions?
              </h2>
              <p className="text-gray-600">
                Get in touch with us to learn more about how we can help you manage your solar energy systems
              </p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="type" className="text-sm font-medium text-gray-700">
                  Inquiry Type
                </label>
                <Select
                  value={formData.inquiryType}
                  onValueChange={(value) => setFormData({ ...formData, inquiryType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select inquiry type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-gray-700">
                  Message
                </label>
                <Textarea
                  id="message"
                  placeholder="Tell us about your needs..."
                  className="min-h-[150px]"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" className="w-full text-white hover:bg-opacity-90" style={{ backgroundColor: navyColor }}>
                Submit Inquiry
              </Button>
            </form>

            <div className="mt-12 text-center text-gray-600">
              <p className="mb-2">Email: info@nebulapower.com</p>
              <p>Phone: +1 (555) 123-4567</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Sun className="h-6 w-6 text-amber-500" />
                <span className="text-xl font-bold">NebulaPower</span>
              </div>
              <p className="text-gray-400">
                Affordable solar energy solutions with advanced monitoring and management
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => scrollToSection("home")}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Home
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("features")}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("how-it-works")}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    How It Works
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("contact")}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <div className="space-y-2">
                <a
                  href="mailto:info@nebulapower.com"
                  className="flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  info@nebulapower.com
                </a>
                <a
                  href="tel:+15551234567"
                  className="flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  +1 (555) 123-4567
                </a>
              </div>
              <div className="flex space-x-4 mt-4">
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-6 h-6" />
                </a>
              
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
            <p>&copy; {new Date().getFullYear()} NebulaPower. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

