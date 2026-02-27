'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type TokenUsageGraphProps = {
  events: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  }[];
};

export default function TokenUsageGraph({ events }: TokenUsageGraphProps) {
  const data = events.map((event, index) => ({
    name: `E${index + 1}`,
    total: event.totalTokens,
    prompt: event.promptTokens,
    completion: event.completionTokens,
  })).reverse();

  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">Token Usage</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total" />
            <Line type="monotone" dataKey="prompt" stroke="#82ca9d" name="Prompt" />
            <Line type="monotone" dataKey="completion" stroke="#ffc658" name="Completion" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
