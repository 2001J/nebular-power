"use client"
import { Pencil } from "lucide-react"
import type React from "react"

import { useAuth } from "@/components/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"

export default function ProfilePage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Profile card */}
        <Card className="w-full md:w-1/3">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center">
              <div className="relative mb-2">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="/placeholder.svg?height=96&width=96" alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <Pencil className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
            <CardTitle className="text-xl">{user.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        {/* Info tabs */}
        <div className="w-full md:w-2/3">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                      <span className="text-gray-700">Account number</span>
                      <span className="text-gray-500">8745 1147 8895 4125</span>
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                      <span className="text-gray-700">Username</span>
                      <span className="text-gray-500">{user.name.toLowerCase().replace(" ", "") + "83"}</span>
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                      <span className="text-gray-700">Email</span>
                      <span className="text-gray-500">{user.email}</span>
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                      <span className="text-gray-700">Mobile phone</span>
                      <span className="text-gray-500">+48 547 599 541</span>
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Addresses</span>
                      </div>
                      <div className="mt-1 text-right text-gray-500">
                        <p>Kancellarijos str 45-13, Vilnius</p>
                        <p>Paraudos awe 148, Azagariai village, Utena County</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Loan & Payment Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <CreditCard className="h-5 w-5 text-blue-500 mr-2" />
                      <h3 className="font-medium">Payment Progress</h3>
                      <span className="ml-auto font-medium">45%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                      <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: "45%" }}></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-500">Total Loan</div>
                        <div className="text-xl font-bold">$15,000.00</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Amount Paid</div>
                        <div className="text-xl font-bold">$6,750.00</div>
                      </div>
                    </div>

                    <div className="bg-blue-100 p-3 rounded-lg">
                      <div className="text-sm text-gray-700 font-medium">Next Payment</div>
                      <div className="text-xl font-bold">$320.50</div>
                      <div className="text-sm text-gray-500">Due on Apr 11, 2025</div>
                      <div className="text-sm text-gray-500">26 payments remaining</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <span className="text-gray-700 block">Change PIN</span>
                        <span className="text-gray-500 text-sm">Update your account PIN</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <span className="text-gray-700 block">Change Password</span>
                        <span className="text-gray-500 text-sm">Update your account password</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <span className="text-gray-700 block">Two-factor Authentication</span>
                        <span className="text-gray-500 text-sm">Add an extra layer of security</span>
                      </div>
                      <Switch />
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <span className="text-gray-700 block">Authenticator</span>
                        <span className="text-gray-500 text-sm">Use an authenticator app</span>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <span className="text-gray-700 block">Terms and Conditions</span>
                        <span className="text-gray-500 text-sm">View our terms and conditions</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <span className="text-gray-700 block">Privacy Policy</span>
                        <span className="text-gray-500 text-sm">View our privacy policy</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <span className="text-gray-700 block">Data Sharing</span>
                        <span className="text-gray-500 text-sm">Manage how your data is shared</span>
                      </div>
                      <Switch />
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <span className="text-gray-700 block">Marketing Preferences</span>
                        <span className="text-gray-500 text-sm">Manage marketing communications</span>
                      </div>
                      <Switch />
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <span className="text-gray-700 block">General Data Protection Regulation</span>
                        <span className="text-gray-500 text-sm">View GDPR information</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function CreditCard(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  )
}

function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

