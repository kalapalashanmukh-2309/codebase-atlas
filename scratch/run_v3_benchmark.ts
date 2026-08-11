/**
 * scratch/run_v3_benchmark.ts
 *
 * Automated runner executing the Controlled Four-System Benchmark for V3.
 * Evaluates System A, System B, System C, and System D against ground truth annotations.
 */

import { runSystemA, runSystemB, runSystemC, runSystemD, type BenchmarkInput } from "../lib/benchmark-engine";
import { evaluateSystemResults, type MetricEvaluation, type RetrievalResult } from "./benchmarks/evaluate";
import queries from "./benchmarks/queries.json";

// Mock repository file corpus matching the benchmark domain model
const mockRepoFiles = [
  {
    path: "src/orders/OrderController.ts",
    content: `
import { OrderService } from "./OrderService";
export class OrderController {
  private orderService = new OrderService();
  async create(req: any) {
    return this.orderService.createOrder(req.body);
  }
}
`,
  },
  {
    path: "src/orders/OrderService.ts",
    content: `
import { OrderRepository } from "./OrderRepository";
import { NotificationService } from "../notifications/NotificationService";
export class OrderService {
  private repo = new OrderRepository();
  private notifier = new NotificationService();
  async createOrder(data: any) {
    const saved = await this.repo.save(data);
    await this.notifier.sendNotification("user", saved);
    return saved;
  }
}
`,
  },
  {
    path: "src/orders/OrderRepository.ts",
    content: `
export class OrderRepository {
  async save(data: any) {
    return { id: "ord-123", ...data };
  }
}
`,
  },
  {
    path: "src/notifications/NotificationService.ts",
    content: `
import { EmailProvider } from "./EmailProvider";
export class NotificationService {
  private email = new EmailProvider();
  async sendNotification(target: string, payload: any) {
    return this.email.send(target, payload);
  }
}
`,
  },
  {
    path: "src/notifications/EmailProvider.ts",
    content: `
export class EmailProvider {
  async send(target: string, payload: any) {
    console.log("Sending email to " + target);
  }
}
`,
  },
  {
    path: "src/auth/AuthService.ts",
    content: `
import { UserRepository } from "../users/UserRepository";
import { SessionStore } from "../session/SessionStore";
export class AuthService {
  private users = new UserRepository();
  private session = new SessionStore();
  async validateToken(token: string) {
    const user = await this.users.findUser("1");
    const sess = await this.session.getSession(token);
    return { user, sess };
  }
}
`,
  },
  {
    path: "src/users/UserRepository.ts",
    content: `
export class UserRepository {
  async findUser(id: string) {
    return { id, name: "Alice" };
  }
}
`,
  },
  {
    path: "src/session/SessionStore.ts",
    content: `
export class SessionStore {
  async getSession(token: string) {
    return { token, valid: true };
  }
}
`,
  },
  {
    path: "src/router/AppRouter.ts",
    content: `
import { AuthGuard } from "../middleware/AuthGuard";
import { BaseController } from "../core/BaseController";
export class AppRouter {
  static setup() {
    AuthGuard.check();
    BaseController.handle();
  }
}
`,
  },
  {
    path: "src/middleware/AuthGuard.ts",
    content: `
export class AuthGuard {
  static check() {
    return true;
  }
}
`,
  },
  {
    path: "src/core/BaseController.ts",
    content: `
export class BaseController {
  static handle() {
    return "ok";
  }
}
`,
  },
];

async function runBenchmark() {
  console.log("=========================================================");
  console.log("   CODEBASE ATLAS V3: CONTROLLED FOUR-SYSTEM BENCHMARK   ");
  console.log("=========================================================\n");

  const resultsA: RetrievalResult[] = [];
  const resultsB: RetrievalResult[] = [];
  const resultsC: RetrievalResult[] = [];
  const resultsD: RetrievalResult[] = [];

  for (const q of queries) {
    const input: BenchmarkInput = {
      queryId: q.id,
      query: q.query,
      files: mockRepoFiles,
    };

    resultsA.push(runSystemA(input));
    resultsB.push(runSystemB(input));
    resultsC.push(runSystemC(input));
    resultsD.push(runSystemD(input));
  }

  const evalA = evaluateSystemResults("System A (Keyword)", resultsA);
  const evalB = evaluateSystemResults("System B (Vector RAG)", resultsB);
  const evalC = evaluateSystemResults("System C (Entity Graph)", resultsC);
  const evalD = evaluateSystemResults("System D (Hybrid)", resultsD);

  console.log("--------------------------------------------------------------------------------------------------");
  console.log("Metric                       | System A (Keyword) | System B (Vector) | System C (Graph) | System D (Hybrid)");
  console.log("--------------------------------------------------------------------------------------------------");
  printMetricRow("Top-1 Entity Accuracy", [evalA.top1Accuracy, evalB.top1Accuracy, evalC.top1Accuracy, evalD.top1Accuracy], true);
  printMetricRow("Top-5 Recall", [evalA.top5Recall, evalB.top5Recall, evalC.top5Recall, evalD.top5Recall], true);
  printMetricRow("Relevant File Recall", [evalA.relevantFileRecall, evalB.relevantFileRecall, evalC.relevantFileRecall, evalD.relevantFileRecall], true);
  printMetricRow("Noise Ratio (Lower=Better)", [evalA.noiseRatio, evalB.noiseRatio, evalC.noiseRatio, evalD.noiseRatio], true);
  printMetricRow("Non-Keyword Recall (PRIMARY)", [evalA.nonKeywordEntityRecall, evalB.nonKeywordEntityRecall, evalC.nonKeywordEntityRecall, evalD.nonKeywordEntityRecall], true);
  printMetricRow("Avg Token Cost", [evalA.avgTokenCost, evalB.avgTokenCost, evalC.avgTokenCost, evalD.avgTokenCost], false);
  printMetricRow("Diagnosis Success Rate", [evalA.diagnosisSuccessRate, evalB.diagnosisSuccessRate, evalC.diagnosisSuccessRate, evalD.diagnosisSuccessRate], true);
  console.log("--------------------------------------------------------------------------------------------------\n");
}

function printMetricRow(name: string, vals: number[], isPercentage: boolean) {
  const formatted = vals.map((v) => (isPercentage ? (v * 100).toFixed(1) + "%" : Math.round(v).toString()));
  const pad = (str: string, len: number) => str.padEnd(len, " ");
  console.log(`${pad(name, 28)} | ${pad(formatted[0], 18)} | ${pad(formatted[1], 17)} | ${pad(formatted[2], 16)} | ${pad(formatted[3], 16)}`);
}

runBenchmark();
