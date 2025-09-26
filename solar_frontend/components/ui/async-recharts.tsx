"use client";

import dynamic from 'next/dynamic';

// Dynamically import Recharts components to cut initial JS and disable SSR for them
// Cast to any to appease TS generics for dynamic loader types
export const ResponsiveContainer = dynamic<any>(() => import('recharts').then(m => m.ResponsiveContainer as any), { ssr: false });
export const AreaChart = dynamic<any>(() => import('recharts').then(m => m.AreaChart as any), { ssr: false });
export const LineChart = dynamic<any>(() => import('recharts').then(m => m.LineChart as any), { ssr: false });
export const BarChart = dynamic<any>(() => import('recharts').then(m => m.BarChart as any), { ssr: false });
export const ComposedChart = dynamic<any>(() => import('recharts').then(m => m.ComposedChart as any), { ssr: false });
export const PieChart = dynamic<any>(() => import('recharts').then(m => m.PieChart as any), { ssr: false });

export const Area = dynamic<any>(() => import('recharts').then(m => m.Area as any), { ssr: false });
export const Line = dynamic<any>(() => import('recharts').then(m => m.Line as any), { ssr: false });
export const Bar = dynamic<any>(() => import('recharts').then(m => m.Bar as any), { ssr: false });
export const Pie = dynamic<any>(() => import('recharts').then(m => m.Pie as any), { ssr: false });
export const Cell = dynamic<any>(() => import('recharts').then(m => m.Cell as any), { ssr: false });

export const CartesianGrid = dynamic<any>(() => import('recharts').then(m => m.CartesianGrid as any), { ssr: false });
export const XAxis = dynamic<any>(() => import('recharts').then(m => m.XAxis as any), { ssr: false });
export const YAxis = dynamic<any>(() => import('recharts').then(m => m.YAxis as any), { ssr: false });
export const Tooltip = dynamic<any>(() => import('recharts').then(m => m.Tooltip as any), { ssr: false });
export const Legend = dynamic<any>(() => import('recharts').then(m => m.Legend as any), { ssr: false });
export const ReferenceLine = dynamic<any>(() => import('recharts').then(m => m.ReferenceLine as any), { ssr: false });
