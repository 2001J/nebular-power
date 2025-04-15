"use client"

import { useState } from "react"
import { Battery, Sun, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"

export default function LayoutPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedSite, setSelectedSite] = useState("site1")
  const [editMode, setEditMode] = useState(false)

  if (!user) return null

  // Mock data for the installation layout
  const installationData = {
    site1: {
      name: "Main Residence",
      address: "123 Solar Street, Sunnyville",
      installDate: "2023-03-27",
      systemSize: 8.82,
      panels: 28,
      inverters: 1,
      batteries: 1,
      layout: [
        { id: 1, type: "panel", x: 10, y: 10, orientation: "portrait", status: "active" },
        { id: 2, type: "panel", x: 10, y: 60, orientation: "portrait", status: "active" },
        { id: 3, type: "panel", x: 10, y: 110, orientation: "portrait", status: "active" },
        { id: 4, type: "panel", x: 10, y: 160, orientation: "portrait", status: "active" },
        { id: 5, type: "panel", x: 60, y: 10, orientation: "portrait", status: "active" },
        { id: 6, type: "panel", x: 60, y: 60, orientation: "portrait", status: "active" },
        { id: 7, type: "panel", x: 60, y: 110, orientation: "portrait", status: "active" },
        { id: 8, type: "panel", x: 60, y: 160, orientation: "portrait", status: "active" },
        { id: 9, type: "panel", x: 110, y: 10, orientation: "portrait", status: "active" },
        { id: 10, type: "panel", x: 110, y: 60, orientation: "portrait", status: "active" },
        { id: 11, type: "panel", x: 110, y: 110, orientation: "portrait", status: "active" },
        { id: 12, type: "panel", x: 110, y: 160, orientation: "portrait", status: "active" },
        { id: 13, type: "panel", x: 160, y: 10, orientation: "portrait", status: "active" },
        { id: 14, type: "panel", x: 160, y: 60, orientation: "portrait", status: "active" },
        { id: 15, type: "panel", x: 160, y: 110, orientation: "portrait", status: "active" },
        { id: 16, type: "panel", x: 160, y: 160, orientation: "portrait", status: "active" },
        { id: 17, type: "panel", x: 210, y: 10, orientation: "portrait", status: "active" },
        { id: 18, type: "panel", x: 210, y: 60, orientation: "portrait", status: "active" },
        { id: 19, type: "panel", x: 210, y: 110, orientation: "portrait", status: "active" },
        { id: 20, type: "panel", x: 210, y: 160, orientation: "portrait", status: "active" },
        { id: 21, type: "panel", x: 260, y: 10, orientation: "portrait", status: "active" },
        { id: 22, type: "panel", x: 260, y: 60, orientation: "portrait", status: "active" },
        { id: 23, type: "panel", x: 260, y: 110, orientation: "portrait", status: "active" },
        { id: 24, type: "panel", x: 260, y: 160, orientation: "portrait", status: "active" },
        { id: 25, type: "panel", x: 310, y: 10, orientation: "portrait", status: "active" },
        { id: 26, type: "panel", x: 310, y: 60, orientation: "portrait", status: "active" },
        { id: 27, type: "panel", x: 310, y: 110, orientation: "portrait", status: "active" },
        { id: 28, type: "panel", x: 310, y: 160, orientation: "portrait", status: "active" },
        { id: 29, type: "inverter", x: 160, y: 220, status: "active" },
        { id: 30, type: "battery", x: 210, y: 220, status: "active" },
      ],
    },
    site2: {
      name: "Vacation Home",
      address: "456 Beach Road, Coastville",
      installDate: "2024-01-15",
      systemSize: 6.24,
      panels: 20,
      inverters: 1,
      batteries: 1,
      layout: [
        { id: 1, type: "panel", x: 10, y: 10, orientation: "landscape", status: "active" },
        { id: 2, type: "panel", x: 60, y: 10, orientation: "landscape", status: "active" },
        { id: 3, type: "panel", x: 110, y: 10, orientation: "landscape", status: "active" },
        { id: 4, type: "panel", x: 160, y: 10, orientation: "landscape", status: "active" },
        { id: 5, type: "panel", x: 210, y: 10, orientation: "landscape", status: "active" },
        { id: 6, type: "panel", x: 10, y: 60, orientation: "landscape", status: "active" },
        { id: 7, type: "panel", x: 60, y: 60, orientation: "landscape", status: "active" },
        { id: 8, type: "panel", x: 110, y: 60, orientation: "landscape", status: "active" },
        { id: 9, type: "panel", x: 160, y: 60, orientation: "landscape", status: "active" },
        { id: 10, type: "panel", x: 210, y: 60, orientation: "landscape", status: "active" },
        { id: 11, type: "panel", x: 10, y: 110, orientation: "landscape", status: "active" },
        { id: 12, type: "panel", x: 60, y: 110, orientation: "landscape", status: "active" },
        { id: 13, type: "panel", x: 110, y: 110, orientation: "landscape", status: "active" },
        { id: 14, type: "panel", x: 160, y: 110, orientation: "landscape", status: "active" },
        { id: 15, type: "panel", x: 210, y: 110, orientation: "landscape", status: "active" },
        { id: 16, type: "panel", x: 10, y: 160, orientation: "landscape", status: "active" },
        { id: 17, type: "panel", x: 60, y: 160, orientation: "landscape", status: "active" },
        { id: 18, type: "panel", x: 110, y: 160, orientation: "landscape", status: "active" },
        { id: 19, type: "panel", x: 160, y: 160, orientation: "landscape", status: "active" },
        { id: 20, type: "panel", x: 210, y: 160, orientation: "landscape", status: "active" },
        { id: 21, type: "inverter", x: 110, y: 220, status: "active" },
        { id: 22, type: "battery", x: 160, y: 220, status: "active" },
      ],
    },
  }

  const currentSite = installationData[selectedSite]

  // Function to render a component in the layout
  const renderComponent = (component) => {
    const style = {
      position: "absolute",
      left: `${component.x}px`,
      top: `${component.y}px`,
      cursor: editMode ? "move" : "pointer",
    }

    if (component.type === "panel") {
      const panelStyle = {
        ...style,
        width: component.orientation === "portrait" ? "40px" : "50px",
        height: component.orientation === "portrait" ? "50px" : "40px",
        backgroundColor: component.status === "active" ? "#4ade80" : "#f87171",
        border: "1px solid #333",
        borderRadius: "2px",
      }

      return (
        <div
          key={component.id}
          style={panelStyle}
          className="flex items-center justify-center"
          title={`Panel ${component.id}`}
        >
          <Sun className="h-4 w-4 text-white" />
        </div>
      )
    } else if (component.type === "inverter") {
      return (
        <div
          key={component.id}
          style={{
            ...style,
            width: "50px",
            height: "50px",
            backgroundColor: component.status === "active" ? "#60a5fa" : "#f87171",
            border: "1px solid #333",
            borderRadius: "4px",
          }}
          className="flex items-center justify-center"
          title="Inverter"
        >
          <Zap className="h-6 w-6 text-white" />
        </div>
      )
    } else if (component.type === "battery") {
      return (
        <div
          key={component.id}
          style={{
            ...style,
            width: "50px",
            height: "50px",
            backgroundColor: component.status === "active" ? "#a78bfa" : "#f87171",
            border: "1px solid #333",
            borderRadius: "4px",
          }}
          className="flex items-center justify-center"
          title="Battery"
        >
          <Battery className="h-6 w-6 text-white" />
        </div>
      )
    }

    return null
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">System Layout</h1>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Choose a site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="site1">Main Residence</SelectItem>
              <SelectItem value="site2">Vacation Home</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>
            {editMode ? "View Mode" : "Edit Mode"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="border">
            <CardHeader>
              <CardTitle>Installation Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="visual" className="w-full">
                <TabsList>
                  <TabsTrigger value="visual">Visual Layout</TabsTrigger>
                  <TabsTrigger value="list">Component List</TabsTrigger>
                </TabsList>

                <TabsContent value="visual" className="mt-4">
                  <div className="relative border rounded-md bg-gray-50" style={{ height: "400px", overflow: "auto" }}>
                    <div className="absolute top-0 left-0 w-full h-full">
                      {/* Roof outline */}
                      <div
                        className="absolute"
                        style={{
                          left: "5px",
                          top: "5px",
                          width: "350px",
                          height: "250px",
                          border: "2px dashed #94a3b8",
                        }}
                      >
                        <div className="absolute top-0 left-0 bg-gray-200 text-gray-600 text-xs px-1">Roof</div>
                      </div>

                      {/* Render all components */}
                      {currentSite.layout.map((component) => renderComponent(component))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-400 rounded-sm"></div>
                      <span className="text-sm">Active Panel</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-400 rounded-sm"></div>
                      <span className="text-sm">Inverter</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-400 rounded-sm"></div>
                      <span className="text-sm">Battery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-400 rounded-sm"></div>
                      <span className="text-sm">Inactive Component</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="list" className="mt-4">
                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Position
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentSite.layout.map((component) => (
                          <tr key={component.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {component.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {component.type.charAt(0).toUpperCase() + component.type.slice(1)}
                              {component.type === "panel" && ` (${component.orientation})`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <Badge variant={component.status === "active" ? "default" : "destructive"}>
                                {component.status.charAt(0).toUpperCase() + component.status.slice(1)}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              X: {component.x}, Y: {component.y}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <Button variant="ghost" size="sm">
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border mb-6">
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Site Name</span>
                <span>{currentSite.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Address</span>
                <span>{currentSite.address}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Installation Date</span>
                <span>{currentSite.installDate}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">System Size</span>
                <span>{currentSite.systemSize} kWp</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Panels</span>
                <span>{currentSite.panels}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Inverters</span>
                <span>{currentSite.inverters}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Batteries</span>
                <span>{currentSite.batteries}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardHeader>
              <CardTitle>Component Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Panel Type</h3>
                <div className="bg-gray-100 rounded-md p-3">
                  <div className="flex justify-between text-sm">
                    <span>Manufacturer</span>
                    <span>SunPower</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Model</span>
                    <span>SPR-X22-360</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Wattage</span>
                    <span>360W</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Efficiency</span>
                    <span>22.7%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Inverter</h3>
                <div className="bg-gray-100 rounded-md p-3">
                  <div className="flex justify-between text-sm">
                    <span>Manufacturer</span>
                    <span>SolarEdge</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Model</span>
                    <span>SE10000H</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Capacity</span>
                    <span>10kW</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Battery</h3>
                <div className="bg-gray-100 rounded-md p-3">
                  <div className="flex justify-between text-sm">
                    <span>Manufacturer</span>
                    <span>Tesla</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Model</span>
                    <span>Powerwall 2</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Capacity</span>
                    <span>13.5 kWh</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {editMode && (
        <Card className="border">
          <CardHeader>
            <CardTitle>Layout Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Add Component</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="component-type">Component Type</Label>
                    <Select defaultValue="panel">
                      <SelectTrigger id="component-type">
                        <SelectValue placeholder="Select component type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="panel">Solar Panel</SelectItem>
                        <SelectItem value="inverter">Inverter</SelectItem>
                        <SelectItem value="battery">Battery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orientation">Orientation</Label>
                    <Select defaultValue="portrait">
                      <SelectTrigger id="orientation">
                        <SelectValue placeholder="Select orientation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full">Add Component</Button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Position</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="x-position">X Position</Label>
                    <div className="flex items-center gap-2">
                      <Slider defaultValue={[100]} max={350} step={5} />
                      <Input id="x-position" type="number" className="w-16" defaultValue={100} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="y-position">Y Position</Label>
                    <div className="flex items-center gap-2">
                      <Slider defaultValue={[100]} max={350} step={5} />
                      <Input id="y-position" type="number" className="w-16" defaultValue={100} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Properties</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="active-status">Active Status</Label>
                    <Switch id="active-status" defaultChecked />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="component-id">Component ID</Label>
                    <Input id="component-id" type="text" disabled value="Auto-generated" />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      Reset
                    </Button>
                    <Button className="flex-1">Save</Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

