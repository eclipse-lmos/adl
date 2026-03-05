'use client';

import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useTheme } from 'next-themes';

type GaugeChartProps = {
  value: number;
  label: string;
};

export default function GaugeChart({ value, label }: GaugeChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const primaryColor = isDark ? 'hsl(210 40% 98%)' : 'hsl(221.2 83.2% 53.3%)';
  const gaugeColor = 'hsl(var(--chart-2))';

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: '100px', height: '100px' }}>
        <CircularProgressbar
          value={value}
          text={`${value.toFixed(0)}`}
          strokeWidth={10}
          styles={buildStyles({
            pathColor: gaugeColor,
            textColor: primaryColor,
            trailColor: 'hsl(var(--muted))',
            pathTransitionDuration: 0.5,
          })}
        />
      </div>
      <p className="text-sm font-medium text-muted-foreground mt-2">{label}</p>
    </div>
  );
}

    