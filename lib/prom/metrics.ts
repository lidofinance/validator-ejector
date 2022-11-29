import client from "prom-client";
import { register } from "./";

export const pollingLastBlocksDurationSeconds = new client.Histogram({
  name: "polling_last_blocks_duration_seconds",
  help: "Duration of pooling last blocks in microseconds",
  labelNames: ["eventsNumber"],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

register.registerMetric(pollingLastBlocksDurationSeconds);
