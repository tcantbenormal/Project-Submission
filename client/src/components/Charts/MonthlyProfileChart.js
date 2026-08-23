import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts';

const MonthlyProfileChart = ({ data }) => {
  return (
    <div className="chart-container" style={{ width: '100%', height: 300, background: '#fff', padding: '10px', borderRadius: '8px' }}>
      <h4 style={{ textAlign: 'center', fontFamily: 'Inter', color: '#0A2342', marginBottom: '20px' }}>Average Monthly Profile</h4>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" orientation="left" stroke="#F5A623" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" stroke="#0F7A6E" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar yAxisId="left" dataKey="PVOUT" fill="#F5A623" name="PVOUT (kWh/kWp)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
          <Line yAxisId="right" type="monotone" dataKey="GHI" stroke="#0F7A6E" strokeWidth={3} name="GHI (kWh/m²)" dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyProfileChart;
