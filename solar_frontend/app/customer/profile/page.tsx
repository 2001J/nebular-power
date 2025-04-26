"use client"
import { Pencil, ChevronRight, CreditCard, Save, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { userApi } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

// Define types for profile data
interface ProfileData {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  status: string;
  emailVerified: boolean;
  lastLogin: string;
  createdAt: string;
  installationDate?: string;
  installationType?: string;
}

interface ActivityLog {
  id: string;
  activity: string;
  details: string;
  timestamp: string;
  activityType: string;
  ipAddress: string;
}

export default function ProfilePage() {
  const { user, token } = useAuth()
  const { toast } = useToast()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    fullName: '',
    email: '',
    phoneNumber: ''
  })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        // Call the API to get user profile
        const data = await userApi.getCurrentUser()
        setProfileData(data)
        // Initialize edit form with current data
        setEditData({
          fullName: data.fullName || '',
          email: data.email || '',
          phoneNumber: data.phoneNumber || ''
        })
      } catch (error) {
        console.error("Failed to fetch profile:", error)
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    const fetchActivityLogs = async () => {
      try {
        setActivityLoading(true)
        const response = await userApi.getActivityLogs(0, 5)
        if (response && response.content) {
          setActivityLogs(response.content)
        }
      } catch (error) {
        console.error("Failed to fetch activity logs:", error)
      } finally {
        setActivityLoading(false)
      }
    }

    if (token) {
      fetchProfile()
      fetchActivityLogs()
    }
  }, [token, toast])

  const handleSaveProfile = async () => {
    try {
      // Validate required fields
      if (!editData.fullName || !editData.email || !editData.phoneNumber) {
        toast({
          title: "Error",
          description: "All fields are required.",
          variant: "destructive"
        })
        return
      }

      // Check if any changes were made
      if (
        editData.fullName === profileData?.fullName &&
        editData.email === profileData?.email &&
        editData.phoneNumber === profileData?.phoneNumber
      ) {
        setIsEditing(false)
        return
      }

      // Call the API to update the profile
      const updatedProfile = await userApi.updateProfile({
        fullName: editData.fullName,
        email: editData.email,
        phoneNumber: editData.phoneNumber,
        currentPassword: editData.email !== profileData?.email ? currentPassword : undefined
      })

      setProfileData(updatedProfile)
      setIsEditing(false)
      
      toast({
        title: "Success",
        description: "Profile updated successfully.",
      })
    } catch (error) {
      console.error("Failed to update profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleChangePassword = async () => {
    try {
      // Validate passwords
      if (!currentPassword) {
        toast({
          title: "Error",
          description: "Current password is required.",
          variant: "destructive"
        })
        return
      }

      if (!newPassword || !confirmPassword) {
        toast({
          title: "Error",
          description: "New password and confirmation are required.",
          variant: "destructive"
        })
        return
      }

      if (newPassword !== confirmPassword) {
        toast({
          title: "Error",
          description: "New passwords do not match.",
          variant: "destructive"
        })
        return
      }

      if (newPassword.length < 6) {
        toast({
          title: "Error",
          description: "Password must be at least 6 characters long.",
          variant: "destructive"
        })
        return
      }

      // Call API to change password
      await userApi.changePassword(currentPassword, newPassword)
      
      // Reset form
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsChangingPassword(false)
      
      toast({
        title: "Success",
        description: "Password changed successfully.",
      })
    } catch (error) {
      console.error("Failed to change password:", error)
      toast({
        title: "Error",
        description: "Failed to change password. Please verify your current password and try again.",
        variant: "destructive"
      })
    }
  }

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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
                  <AvatarImage src="/placeholder-user.jpg" alt={user.name} />
                  <AvatarFallback>{isLoading ? '...' : profileData?.fullName.charAt(0) || user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <Pencil className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
              </div>
            ) : (
              <>
                <CardTitle className="text-xl">{profileData?.fullName || user.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{profileData?.email || user.email}</p>
                <div className="mt-2 text-xs bg-primary/10 text-primary rounded-full px-2 py-1 inline-block">
                  {profileData?.role || user.role}
                </div>
              </>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Button className="w-full" variant="outline" onClick={() => setIsEditing(!isEditing)}>
                <Pencil className="h-4 w-4 mr-2" />
                {isEditing ? "Cancel Edit" : "Edit Profile"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Info tabs */}
        <div className="w-full md:w-2/3">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  {isEditing && (
                    <CardDescription>
                      Update your personal information below. Email changes will require verification.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : isEditing ? (
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input 
                          id="fullName" 
                          value={editData.fullName} 
                          onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={editData.email} 
                          onChange={(e) => setEditData({...editData, email: e.target.value})}
                        />
                      </div>
                      
                      {editData.email !== profileData?.email && (
                        <div className="grid gap-2">
                          <Label htmlFor="currentPassword">Current Password (required to change email)</Label>
                          <Input 
                            id="currentPassword" 
                            type="password" 
                            value={currentPassword} 
                            onChange={(e) => setCurrentPassword(e.target.value)}
                          />
                        </div>
                      )}
                      
                      <div className="grid gap-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input 
                          id="phoneNumber" 
                          value={editData.phoneNumber} 
                          onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                        />
                      </div>
                      
                      <Button onClick={handleSaveProfile} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                        <span className="text-gray-700">Account ID</span>
                        <span className="text-gray-500">{profileData?.id || user.id}</span>
                      </div>

                      <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                        <span className="text-gray-700">Full Name</span>
                        <span className="text-gray-500">{profileData?.fullName || user.name}</span>
                      </div>

                      <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                        <span className="text-gray-700">Email</span>
                        <span className="text-gray-500">{profileData?.email || user.email}</span>
                      </div>

                      <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                        <span className="text-gray-700">Phone</span>
                        <span className="text-gray-500">{profileData?.phoneNumber || 'Not provided'}</span>
                      </div>

                      <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                        <span className="text-gray-700">Account Status</span>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          profileData?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                          profileData?.status === 'SUSPENDED' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {profileData?.status || 'ACTIVE'}
                        </span>
                      </div>

                      <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                        <span className="text-gray-700">Email Verified</span>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          profileData?.emailVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {profileData?.emailVerified ? 'Verified' : 'Not Verified'}
                        </span>
                      </div>

                      <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                        <span className="text-gray-700">Last Login</span>
                        <span className="text-gray-500">{formatDate(profileData?.lastLogin)}</span>
                      </div>

                      <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                        <span className="text-gray-700">Member Since</span>
                        <span className="text-gray-500">{formatDate(profileData?.createdAt)}</span>
                      </div>

                      {profileData?.installationDate && (
                        <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                          <span className="text-gray-700">Installation Date</span>
                          <span className="text-gray-500">{formatDate(profileData.installationDate)}</span>
                        </div>
                      )}

                      {profileData?.installationType && (
                        <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                          <span className="text-gray-700">Installation Type</span>
                          <span className="text-gray-500">{profileData.installationType}</span>
                        </div>
                      )}
                    </div>
                  )}
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
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-gray-700 block">Change Password</span>
                          <span className="text-gray-500 text-sm">Update your account password</span>
                        </div>
                        <Button variant="outline" onClick={() => setIsChangingPassword(!isChangingPassword)}>
                          {isChangingPassword ? "Cancel" : "Change"}
                        </Button>
                      </div>

                      {isChangingPassword && (
                        <div className="mt-4 space-y-3 bg-white p-4 rounded-lg border">
                          <div className="grid gap-1.5">
                            <Label htmlFor="current-password">Current Password</Label>
                            <Input 
                              id="current-password" 
                              type="password" 
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                          </div>
                          
                          <div className="grid gap-1.5">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input 
                              id="new-password" 
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                            />
                          </div>
                          
                          <div className="grid gap-1.5">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input 
                              id="confirm-password" 
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                          </div>
                          
                          <Button onClick={handleChangePassword} className="w-full">Save New Password</Button>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-100 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <span className="text-gray-700 block">Two-factor Authentication</span>
                        <span className="text-gray-500 text-sm">Add an extra layer of security</span>
                      </div>
                      <Switch disabled />
                    </div>

                    <Link href="/forgot-password" className="bg-gray-100 rounded-lg p-4 block">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-gray-700 block">Forgot Password</span>
                          <span className="text-gray-500 text-sm">Reset your password via email</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </Link>

                    {!profileData?.emailVerified && (
                      <div className="bg-yellow-100 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-yellow-800">Email Not Verified</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              Your email is not verified. Please check your inbox for a verification email or click below to resend it.
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2" 
                              onClick={async () => {
                                try {
                                  await userApi.resendVerification(profileData?.email || '');
                                  toast({
                                    title: "Success",
                                    description: "Verification email has been sent. Please check your inbox.",
                                  });
                                } catch (error) {
                                  console.error("Failed to resend verification email:", error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to resend verification email. Please try again later.",
                                    variant: "destructive"
                                  });
                                }
                              }}
                            >
                              Resend Verification Email
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>View your recent account activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((index) => (
                        <div key={index} className="flex gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activityLogs.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No recent activity found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                          <div className="flex justify-between">
                            <span className="font-medium">{log.activity}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(log.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5">
                              {log.activityType}
                            </span>
                            <span className="bg-gray-100 text-gray-700 text-xs rounded-full px-2 py-0.5">
                              {log.ipAddress}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      <Button variant="outline" className="w-full">
                        View All Activity
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

