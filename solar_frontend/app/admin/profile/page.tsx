"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { ShieldCheck, CheckCircle2, Clock3 } from "lucide-react"

export default function AdminProfilePage() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    bio: "",
  })
  const [preferences, setPreferences] = useState({
    digest: true,
    incidentReports: true,
    smsAlerts: false,
  })

  const sessions = [
    {
      device: "Chrome on macOS",
      location: "Nairobi, Kenya",
      lastSeen: "Active now",
    },
    {
      device: "iOS NebulaPower App",
      location: "Mobile",
      lastSeen: "2 hours ago",
    },
    {
      device: "Edge on Windows",
      location: "Office Desktop",
      lastSeen: "Yesterday, 18:45",
    },
  ]

  if (!user) return null

  const handleSaveProfile = () => {
    toast({
      title: "Profile updated",
      description: "Your admin preferences were stored for this session.",
    })
  }

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your administrator identity, notifications, and security preferences.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin">Back to Overview</Link>
          </Button>
          <Button variant="destructive" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
            <CardDescription>Information shared with other NebulaPower admins.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={profileForm.name}
                  onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Direct line</Label>
                <Input
                  id="phone"
                  placeholder="+123 456 7890"
                  value={profileForm.phone}
                  onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input readOnly value={user.role} className="uppercase tracking-wide" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">About</Label>
                <Textarea
                  id="bio"
                  placeholder="Share your responsibilities or escalation notes for other admins."
                  value={profileForm.bio}
                  onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveProfile}>Save preferences</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification status</CardTitle>
            <CardDescription>Your account trust signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Email verified</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Admin clearance</p>
                <p className="text-xs text-muted-foreground">Full system access</p>
              </div>
              <Badge variant="outline" className="gap-1 text-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Tier 1
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              NebulaPower enforces device-based authorization. Contact security if you see unfamiliar sessions below.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Communication preferences</CardTitle>
            <CardDescription>Choose how platform updates reach you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Weekly operations digest</p>
                <p className="text-xs text-muted-foreground">Summary of system uptime, revenue, and incidents.</p>
              </div>
              <Switch checked={preferences.digest} onCheckedChange={() => togglePreference("digest")}/>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Critical incident alerts</p>
                <p className="text-xs text-muted-foreground">Immediate push + email alerts for tamper or outages.</p>
              </div>
              <Switch checked={preferences.incidentReports} onCheckedChange={() => togglePreference("incidentReports")}/>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium">SMS confirmations</p>
                <p className="text-xs text-muted-foreground">Receive a short SMS when payments batches close.</p>
              </div>
              <Switch checked={preferences.smsAlerts} onCheckedChange={() => togglePreference("smsAlerts")}/>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security & access</CardTitle>
            <CardDescription>Keep your admin session healthy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-card/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Password</p>
                  <p className="text-xs text-muted-foreground">Recommended to rotate every 60 days.</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/change-password">Update</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">OTP app support is rolling out soon.</p>
                </div>
                <Badge variant="secondary">Coming soon</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/70 px-4 py-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock3 className="h-4 w-4 text-muted-foreground" />
                Active sessions
              </div>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.device} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{session.device}</span>
                      <span className="text-xs text-muted-foreground">{session.location}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{session.lastSeen}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notes for platform team</CardTitle>
          <CardDescription>Share any configuration requests or blockers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="e.g. Need billing sandbox user for new partner..." rows={4} />
          <div className="mt-4 flex justify-end">
            <Button variant="secondary">Submit note</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
