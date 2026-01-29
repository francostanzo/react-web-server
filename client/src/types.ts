export interface Metrics {
  server: {
    uptimeSeconds: number;
    nodeVersion: string;
    pid: number;
    env: string;
    timestamp: string;
  };
  memory: {
    rssMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
  };
  system: {
    platform: string;
    arch: string;
    cpuCores: number;
    loadAvg: number[];
  };
}
