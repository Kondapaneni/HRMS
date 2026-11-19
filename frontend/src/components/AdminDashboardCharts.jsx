import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

import ChartCard from './ui/ChartCard';

const CHART_PALETTE = ['#8AADDB', '#E3B9DF', '#131315', '#B9CDE8', '#C98BC2', '#5B86C2'];

export default function AdminDashboardCharts({ data }) {
  const customTooltipStyle = {
    backgroundColor: 'var(--ink, #131315)',
    color: '#FFFFFF',
    borderRadius: '9px',
    padding: '8px 12px',
    fontSize: '12px',
    border: 'none',
    boxShadow: '0 8px 24px rgba(19,19,21,0.2)'
  };


  return (
    <>
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Attendance Trend Bar Chart */}
        <ChartCard
          title="Monthly attendance trend"
          subtitle="Present vs. approved leaves"
          badge="YTD"
        >
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.attendanceData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line, #EFEFF1)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted, #6B6B75)', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted, #6B6B75)', fontSize: 11 }}
                />
                <RechartsTooltip contentStyle={customTooltipStyle} cursor={{ fill: 'var(--brand-tint, #EAF0FA)' }} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: 'var(--muted, #6B6B75)' }}
                />
                <Bar dataKey="present" name="Present" fill="#8AADDB" radius={[10, 10, 0, 0]} maxBarSize={28} />
                <Bar dataKey="leave" name="Leave" fill="#E3B9DF" radius={[10, 10, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Compensation Distribution Chart */}
        <ChartCard
          title="Compensation distribution"
          subtitle="Staff tiers by pay bracket"
          badge="Active staff"
        >
          <div className="w-full h-[280px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.salaryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="range"
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="#FFFFFF"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="11"
                        fontWeight="500"
                      >
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                >
                  {data.salaryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={customTooltipStyle} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: 'var(--muted, #6B6B75)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

    </>
  );
}
