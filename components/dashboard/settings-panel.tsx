"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SettingsIcon } from "lucide-react"

export function SettingsPanel() {
  const [firmName, setFirmName] = useState("Sharma & Associates")
  const [email, setEmail] = useState("accountant@example.com")
  const [phone, setPhone] = useState("+91 98765 43210")

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Settings */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <SettingsIcon size={20} />
          Profile Settings
        </h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="firm-name" className="text-sm font-medium">
              Firm Name
            </Label>
            <Input
              id="firm-name"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              className="mt-2 bg-white dark:bg-slate-700"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 bg-white dark:bg-slate-700"
            />
          </div>

          <div>
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 bg-white dark:bg-slate-700"
            />
          </div>

          <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">Save Changes</Button>
        </div>
      </Card>

      {/* Security Settings */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6">Security Settings</h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="password" className="text-sm font-medium">
              Change Password
            </Label>
            <Button variant="outline" className="mt-2 bg-transparent">
              Update Password
            </Button>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="font-medium text-foreground mb-2">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground mb-3">Add an extra layer of security to your account</p>
            <Button variant="outline">Enable 2FA</Button>
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6">Notification Settings</h2>

        <div className="space-y-4">
          {[
            { id: "email-reminders", label: "Email Reminders" },
            { id: "compliance-alerts", label: "Compliance Alerts" },
            { id: "import-updates", label: "Bank Import Updates" },
            { id: "team-notifications", label: "Team Notifications" },
          ].map((setting) => (
            <div key={setting.id} className="flex items-center justify-between">
              <label htmlFor={setting.id} className="text-sm font-medium text-foreground">
                {setting.label}
              </label>
              <input id={setting.id} type="checkbox" defaultChecked className="w-4 h-4" />
            </div>
          ))}
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-red-200 dark:border-red-900">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-6">Danger Zone</h2>

        <Button variant="destructive" className="w-full sm:w-auto">
          Delete Account
        </Button>
      </Card>
    </div>
  )
}
