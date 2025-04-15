"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  Battery,
  Check,
  CircleDollarSign,
  LineChart,
  Lock,
  ShieldCheck,
  Sun,
  Zap
} from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuth()

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
      router.push("/dashboard")
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Sun className="h-8 w-8 text-amber-500" />
            <span className="text-2xl font-bold">SolarMonitor</span>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <Button onClick={handleDashboard}>Go to Dashboard</Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleLogin}>
                  Sign In
                </Button>
                <Button onClick={handleRegister}>Sign Up</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="bg-gradient-to-b from-blue-900 to-[#1e2e4a] text-white py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Solar Energy Monitoring and Management System
                  </h1>
              <p className="text-lg opacity-90">
                    Track production, manage payments, and optimize your solar energy system all in one place.
                  </p>
              <div className="pt-4 flex flex-wrap gap-4">
                {user ? (
                  <Button size="lg" onClick={handleDashboard}>
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button size="lg" onClick={handleRegister}>
                      Get Started
                    </Button>
                    <Button variant="outline" size="lg" onClick={handleLogin}>
                      Sign In
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="hidden md:block">
              <div className="relative h-80 w-full">
                <div className="absolute top-0 right-0 rounded-lg bg-[#3c4d6d] p-6 w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <LineChart className="h-16 w-16 mx-auto mb-4 text-green-400" />
                    <div className="text-5xl font-bold text-green-400">82.5%</div>
                    <div className="text-sm mt-2 text-gray-300">Energy Efficiency</div>
                  </div>
                </div>
                <div className="absolute top-20 left-0 rounded-lg bg-[#2a3e64] p-6 w-[80%] shadow-lg">
                  <div className="flex items-center gap-4">
                    <Sun className="h-12 w-12 text-amber-400" />
                    <div>
                      <div className="text-3xl font-bold">4.2 kW</div>
                      <div className="text-sm text-gray-300">Current Production</div>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-0 left-20 rounded-lg bg-[#2a3e64] p-6 w-[70%] shadow-lg">
                  <div className="flex items-center gap-4">
                    <Battery className="h-12 w-12 text-green-400" />
                    <div>
                      <div className="text-3xl font-bold">94%</div>
                      <div className="text-sm text-gray-300">Battery Level</div>
                </div>
              </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* Features section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Comprehensive Solar Monitoring</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our platform provides all the tools you need to monitor, manage, and maximize your solar energy investment.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <BarChart className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Real-time Monitoring</h3>
              <p className="text-gray-600">
                Track energy production and consumption in real-time with detailed analytics and visualizations.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CircleDollarSign className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Payment Management</h3>
              <p className="text-gray-600">
                Manage installment payments, view payment history, and download receipts with ease.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Tamper Detection</h3>
              <p className="text-gray-600">
                Advanced security features to detect and alert any tampering attempts on your installation.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Service Controls</h3>
              <p className="text-gray-600">
                Remote service management and system diagnostics to ensure optimal performance.
              </p>
              </div>
            </div>
          </div>
        </section>

      {/* Benefits section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Choose SolarMonitor?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our platform provides unmatched benefits for solar energy system owners and administrators.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-blue-100 p-4 mb-4">
                <Sun className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Affordable Financing</h3>
              <p className="text-gray-600">
                Our installment-based financing model makes solar energy accessible to more homes and businesses.
              </p>
              <ul className="mt-4 space-y-2 text-left w-full">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Flexible payment options</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>No large upfront costs</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Transparent payment tracking</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-green-100 p-4 mb-4">
                <LineChart className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Detailed Analytics</h3>
              <p className="text-gray-600">
                Comprehensive insights into your energy production and consumption patterns.
              </p>
              <ul className="mt-4 space-y-2 text-left w-full">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Real-time performance data</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Historical trend analysis</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Environmental impact metrics</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-amber-100 p-4 mb-4">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Secure & Reliable</h3>
              <p className="text-gray-600">
                Advanced security features and reliable monitoring for peace of mind.
              </p>
              <ul className="mt-4 space-y-2 text-left w-full">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Tamper detection alerts</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Encrypted data transmission</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>24/7 system monitoring</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="bg-[#1e2e4a] text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
            Join thousands of customers who are already monitoring and optimizing their solar installations.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {user ? (
              <Button size="lg" variant="default" onClick={handleDashboard}>
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button size="lg" variant="default" onClick={handleRegister}>
                  Create an Account
                </Button>
                <Button size="lg" variant="outline" onClick={handleLogin}>
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Sun className="h-6 w-6 text-amber-500" />
                <span className="text-xl font-bold">SolarMonitor</span>
              </div>
              <p className="text-gray-400">
                Affordable solar energy solutions with advanced monitoring and management.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="text-gray-400 hover:text-white transition-colors">
                    Support
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Email: info@solarmonitor.com</li>
                <li>Phone: (123) 456-7890</li>
                <li>Address: 123 Solar Street, Sunnyville</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
            <p>&copy; {new Date().getFullYear()} SolarMonitor. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

