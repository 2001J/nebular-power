"use client"

import { TestChart } from "@/components/test-chart"
import { EnergyProductionChart } from "@/components/energy-production-chart"
import { EnergyConsumptionChart } from "@/components/energy-consumption-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestChartsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Chart Testing Page</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Chart (Basic)</CardTitle>
        </CardHeader>
        <CardContent>
          <TestChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Energy Production Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <EnergyProductionChart period="day" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Energy Consumption Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <EnergyConsumptionChart period="day" />
        </CardContent>
      </Card>
    </div>
  )
}