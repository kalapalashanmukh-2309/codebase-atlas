/**
 * scratch/benchmarks/error_analysis.ts
 *
 * Qualitative Per-Query Error & Failure Analysis Script for V3.
 * Inspects retrieval performance for each of the 10 benchmark queries across
 * System A (Keyword), System B (Vector RAG), System C (Entity Graph), and System D (Hybrid).
 */

import { runSystemA, runSystemB, runSystemC, runSystemD, type BenchmarkInput } from "../../lib/benchmark-engine";
import queries from "./queries.json";
import groundTruth from "./ground-truth.json";

// Mock repository file corpus matching the benchmark domain model
const mockRepoFiles = [
  { path: "src/orders/OrderController.ts", content: `import { OrderService } from "./OrderService"; export class OrderController { private orderService = new OrderService(); async create(req: any) { return this.orderService.createOrder(req.body); } }` },
  { path: "src/orders/OrderService.ts", content: `import { OrderRepository } from "./OrderRepository"; import { NotificationService } from "../notifications/NotificationService"; export class OrderService { private repo = new OrderRepository(); private notifier = new NotificationService(); async createOrder(data: any) { const saved = await this.repo.save(data); await this.notifier.sendNotification("user", saved); return saved; } }` },
  { path: "src/orders/OrderRepository.ts", content: `export class OrderRepository { async save(data: any) { return { id: "ord-123", ...data }; } }` },
  { path: "src/notifications/NotificationService.ts", content: `import { EmailProvider } from "./EmailProvider"; export class NotificationService { private email = new EmailProvider(); async sendNotification(target: string, payload: any) { return this.email.send(target, payload); } }` },
  { path: "src/notifications/EmailProvider.ts", content: `export class EmailProvider { async send(target: string, payload: any) { console.log("Sending email to " + target); } }` },
  { path: "src/auth/AuthService.ts", content: `import { UserRepository } from "../users/UserRepository"; import { SessionStore } from "../session/SessionStore"; export class AuthService { private users = new UserRepository(); private session = new SessionStore(); async validateToken(token: string) { const user = await this.users.findUser("1"); const sess = await this.session.getSession(token); return { user, sess }; } }` },
  { path: "src/users/UserRepository.ts", content: `export class UserRepository { async findUser(id: string) { return { id, name: "Alice" }; } }` },
  { path: "src/session/SessionStore.ts", content: `export class SessionStore { async getSession(token: string) { return { token, valid: true }; } }` },
  { path: "src/router/AppRouter.ts", content: `import { AuthGuard } from "../middleware/AuthGuard"; import { BaseController } from "../core/BaseController"; export class AppRouter { static setup() { AuthGuard.check(); BaseController.handle(); } }` },
  { path: "src/middleware/AuthGuard.ts", content: `export class AuthGuard { static check() { return true; } }` },
  { path: "src/core/BaseController.ts", content: `export class BaseController { static handle() { return "ok"; } }` },
];

function runErrorAnalysis() {
  console.log("=========================================================");
  console.log("   V3 BENCHMARK PER-QUERY ERROR & FAILURE ANALYSIS       ");
  console.log("=========================================================\n");

  for (const q of queries) {
    const truth = (groundTruth as Record<string, any>)[q.id];
    if (!truth) continue;

    const input: BenchmarkInput = { queryId: q.id, query: q.query, files: mockRepoFiles };

    const sysA = runSystemA(input);
    const sysB = runSystemB(input);
    const sysC = runSystemC(input);
    const sysD = runSystemD(input);

    console.log(`[Query ${q.id}]: "${q.query}"`);
    console.log(`  Expected Target Top-1 Entity: ${truth.top1Entity}`);
    console.log(`  System A Top-1: ${sysA.retrievedEntities[0] || "NONE"} [${sysA.retrievedEntities[0] === truth.top1Entity ? "HIT ✅" : "MISS ❌"}]`);
    console.log(`  System B Top-1: ${sysB.retrievedEntities[0] || "NONE"} [${sysB.retrievedEntities[0] === truth.top1Entity ? "HIT ✅" : "MISS ❌"}]`);
    console.log(`  System C Top-1: ${sysC.retrievedEntities[0] || "NONE"} [${sysC.retrievedEntities[0] === truth.top1Entity ? "HIT ✅" : "MISS ❌"}]`);
    console.log(`  System D Top-1: ${sysD.retrievedEntities[0] || "NONE"} [${sysD.retrievedEntities[0] === truth.top1Entity ? "HIT ✅" : "MISS ❌"}]`);

    const nonKeyA = sysA.retrievedEntities.filter((e) => truth.nonKeywordEntities.includes(e));
    const nonKeyC = sysC.retrievedEntities.filter((e) => truth.nonKeywordEntities.includes(e));
    console.log(`  Non-Keyword Entities Found: Keyword=${nonKeyA.length}/${truth.nonKeywordEntities.length}, Graph=${nonKeyC.length}/${truth.nonKeywordEntities.length}`);
    console.log("--------------------------------------------------------------------------------------------------\n");
  }
}

runErrorAnalysis();
