"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface ReportsChartsProps {
  categoryData: { name: string; count: number }[];
  timeData: { name: string; hours: number }[];
}

export function ReportsCharts({ categoryData, timeData }: ReportsChartsProps) {
  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-2">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Tickets by Category (30 days)</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 p-4 pt-0 sm:p-6">
          {categoryData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, count }) => `${name}: ${count}`}
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Time Logged by HR Users (30 days)</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 p-4 pt-0 sm:p-6">
          {timeData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No time logs recorded</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="hours" fill="#3b82f6" name="Hours" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
