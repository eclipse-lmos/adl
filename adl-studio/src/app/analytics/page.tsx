'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'urql';
import { DashboardQuery } from '@/lib/graphql/queries';
import AppHeader from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, FileText, Zap, TrendingUp, Clock, BarChart3, ChevronsUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import GaugeChart from '@/components/gauge-chart';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

export default function AnalyticsPage() {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  
  const [result] = useQuery({ 
    query: DashboardQuery,
    requestPolicy: 'network-only' 
  });
  const { data, fetching, error } = result;

  const handleRequestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedUseCaseStats = useMemo(() => {
    const stats = [...(data?.dashboard?.mostUsedUseCase || [])];
    if (sortConfig) {
      stats.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof typeof a];
        const bValue = b[sortConfig.key as keyof typeof b];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return stats;
  }, [data, sortConfig]);

  if (fetching) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <AppHeader />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Loading dashboard analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <AppHeader />
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="max-w-md w-full border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Dashboard Error</CardTitle>
              <CardDescription>Failed to fetch statistics from the server.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stats = data?.dashboard || {
    numberOfAdls: 0,
    mostUsedUseCase: [],
    averageResponseTime: 0
  };

  const responseTimeTarget = 5000;
  const responseTimeScore = Math.max(0, Math.min(100, (1 - stats.averageResponseTime / responseTimeTarget) * 100));

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container mx-auto py-8 px-4 md:px-6">
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Project Analytics</h1>
          <p className="text-muted-foreground">High-level statistics and performance metrics for your ADL Studio environment.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total ADL Files</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.numberOfAdls}</div>
              <p className="text-xs text-muted-foreground mt-1">Managed prompts and contracts</p>
              <div className="mt-4">
                <Progress value={Math.min(100, (stats.numberOfAdls / 50) * 100)} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">Quota usage: {Math.min(100, (stats.numberOfAdls / 50) * 100).toFixed(0)}%</p>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-row items-center gap-8 pt-4">
              <div className="mb-2 shrink-0">
                <GaugeChart value={responseTimeScore} label="Latency Score" />
              </div>
              <div className="flex flex-col">
                <div className="text-4xl font-bold">{(stats.averageResponseTime / 1000).toFixed(2)}s</div>
                <p className="text-xs text-muted-foreground">Mean end-to-end latency</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                UseCase Usage Ranking
            </h2>
            <Card>
                <CardContent className="p-0">
                    {sortedUseCaseStats.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Rank</TableHead>
                                    <TableHead 
                                      className="cursor-pointer select-none hover:bg-muted/50"
                                      onClick={() => handleRequestSort('useCaseId')}
                                    >
                                        <div className="flex items-center">
                                          UseCase ID
                                          <SortIcon columnKey="useCaseId" />
                                        </div>
                                    </TableHead>
                                    <TableHead 
                                      className="text-right cursor-pointer select-none hover:bg-muted/50"
                                      onClick={() => handleRequestSort('count')}
                                    >
                                        <div className="flex items-center justify-end">
                                          Execution Count
                                          <SortIcon columnKey="count" />
                                        </div>
                                    </TableHead>
                                    <TableHead 
                                      className="text-right cursor-pointer select-none hover:bg-muted/50"
                                      onClick={() => handleRequestSort('minComplianceScore')}
                                    >
                                        <div className="flex items-center justify-end">
                                          Min Compliance
                                          <SortIcon columnKey="minComplianceScore" />
                                        </div>
                                    </TableHead>
                                    <TableHead 
                                      className="text-right cursor-pointer select-none hover:bg-muted/50"
                                      onClick={() => handleRequestSort('maxComplianceScore')}
                                    >
                                        <div className="flex items-center justify-end">
                                          Max Compliance
                                          <SortIcon columnKey="maxComplianceScore" />
                                        </div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedUseCaseStats.map((item: any, index: number) => (
                                    <TableRow key={item.useCaseId} className="group">
                                        <TableCell className="font-medium">
                                            <Badge variant={index < 3 ? "default" : "secondary"}>
                                                #{index + 1}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {item.useCaseId}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {item.count}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={cn(
                                              "font-mono text-xs",
                                              item.minComplianceScore > 0.8 ? "text-green-600" : item.minComplianceScore < 0.5 ? "text-red-600" : "text-yellow-600"
                                            )}>
                                              {(item.minComplianceScore).toFixed(1)}%
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={cn(
                                              "font-mono text-xs",
                                              item.maxComplianceScore > 0.8 ? "text-green-600" : item.maxComplianceScore < 0.5 ? "text-red-600" : "text-yellow-600"
                                            )}>
                                              {(item.maxComplianceScore).toFixed(1)}%
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground italic">
                            No usage data available for this project yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
