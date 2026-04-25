"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="bg-muted lg:bg-transparent">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="ai">AI Settings</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card className="border-border">
              <CardHeader><CardTitle className="font-heading text-lg">Personal Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input defaultValue="Jane" />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input defaultValue="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue="jane.doe@company.com" type="email" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input defaultValue="Head of Talent Acquisition" />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company" className="space-y-6 mt-6">
            <Card className="border-border">
              <CardHeader><CardTitle className="font-heading text-lg">Company Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input defaultValue="TechFlow Inc." />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input defaultValue="Technology" />
                </div>
                <div className="space-y-2">
                  <Label>Company Size</Label>
                  <Input defaultValue="200-500 employees" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea defaultValue="A leading SaaS company focused on developer tools and productivity." rows={3} />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6 mt-6">
            <Card className="border-border">
              <CardHeader><CardTitle className="font-heading text-lg">AI Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Bias Reduction Mode</p>
                    <p className="text-xs text-muted-foreground">Remove identifying information during initial screening</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Auto-Screen New Applicants</p>
                    <p className="text-xs text-muted-foreground">Automatically run AI screening when new applications arrive</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Show AI Explanations</p>
                    <p className="text-xs text-muted-foreground">Display detailed reasoning for each AI evaluation</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Minimum Score Threshold</p>
                    <p className="text-xs text-muted-foreground">Auto-reject candidates below this score</p>
                  </div>
                  <Input type="number" defaultValue="50" className="w-20" />
                </div>
                <Button>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 mt-6">
            <Card className="border-border">
              <CardHeader><CardTitle className="font-heading text-lg">Notification Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {[
                  { title: "New Applications", desc: "Get notified when someone applies" },
                  { title: "Screening Complete", desc: "Alert when AI screening finishes" },
                  { title: "Candidate Shortlisted", desc: "Notification when candidates are shortlisted" },
                  { title: "Weekly Summary", desc: "Receive a weekly recruitment report" },
                ].map((item) => (
                  <div key={item.title} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
                <Button>Save Preferences</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
