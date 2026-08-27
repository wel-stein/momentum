import type { JdModule } from "./jd-types";

/**
 * Seed data: proposed JD after promotion —
 * "Technical Lead – Applied AI & Engineering Transformation".
 * IDs are deterministic so every client seeds the same rows.
 */
export const JD_MODULE_ID = "jd-applied-ai-2026";

export function seedJdModule(): JdModule {
  const now = "2026-08-27T00:00:00.000Z";
  return {
    id: JD_MODULE_ID,
    role: "Technical Lead – Applied AI & Engineering Transformation",
    title: "New JD readiness",
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: "r1",
        no: 1,
        title: "Technical Leadership & Engineering Excellence",
        duties: [
          {
            id: "r1d1",
            text: "Lead technical direction across the software development team.",
            status: "not_started",
          },
          {
            id: "r1d2",
            text: "Mentor and develop software engineers in modern engineering practices.",
            status: "not_started",
          },
          {
            id: "r1d3",
            text: "Establish technical standards, reusable architecture patterns and engineering governance.",
            status: "not_started",
          },
          {
            id: "r1d4",
            text: "Continue supervising assigned developers while providing technical leadership across the wider team.",
            status: "not_started",
          },
          {
            id: "r1d5",
            text: "Act as the final technical escalation point for complex engineering decisions.",
            status: "not_started",
          },
        ],
      },
      {
        id: "r2",
        no: 2,
        title: "Applied AI & Agentic Software Development",
        duties: [
          {
            id: "r2d1",
            text: "Drive adoption of AI-powered and agentic software development as the team's default engineering methodology.",
            status: "not_started",
          },
          {
            id: "r2d2",
            text: "Design and establish AI development workflow best practices, reusable agents and engineering frameworks.",
            status: "not_started",
          },
          {
            id: "r2d3",
            text: "Enable developers to use AI beyond coding assistance by delegating analysis, coding, testing, debugging, documentation and automation tasks to AI agents.",
            status: "not_started",
          },
          {
            id: "r2d4",
            text: "Evaluate and introduce emerging AI development tools that improve delivery speed and engineering productivity.",
            status: "not_started",
          },
          {
            id: "r2d5",
            text: "Establish best practices to ensure AI-generated code remains secure, maintainable and production-ready.",
            status: "not_started",
          },
        ],
      },
      {
        id: "r3",
        no: 3,
        title: "Business Value Engineering",
        duties: [
          {
            id: "r3d1",
            text: "Work directly with business owners, with shared KPI with P&L leads, to identify business problems and rapidly develop technology solutions.",
            status: "not_started",
          },
          {
            id: "r3d2",
            text: "Translate business requirements into prototypes, MVPs and production-ready solutions within significantly shorter delivery cycles, enabling rapid iteration with end users.",
            status: "not_started",
          },
          {
            id: "r3d3",
            text: "Prioritise engineering initiatives based on measurable business value, operational efficiency and cost optimisation.",
            status: "not_started",
          },
          {
            id: "r3d4",
            text: "Reduce dependency on external software development vendors by enabling internal rapid solution delivery through AI.",
            status: "not_started",
          },
        ],
      },
      {
        id: "r4",
        no: 4,
        title: "Engineering Productivity Transformation",
        duties: [
          {
            id: "r4d1",
            text: "Build repeatable AI-enabled development processes across the software engineering team.",
            status: "not_started",
          },
          {
            id: "r4d2",
            text: "Measure and continuously improve engineering productivity, delivery cycle time and quality.",
            status: "not_started",
          },
          {
            id: "r4d3",
            text: "Automate repetitive software engineering activities using AI agents and development automation.",
            status: "not_started",
          },
          {
            id: "r4d4",
            text: "Lead initiatives that improve engineering efficiency.",
            status: "not_started",
          },
        ],
      },
      {
        id: "r5",
        no: 5,
        title: "Technical Architecture & Platform Strategy",
        duties: [
          {
            id: "r5d1",
            text: "Own technical architecture for strategic software products.",
            status: "not_started",
          },
          {
            id: "r5d2",
            text: "Review architecture for existing and new systems.",
            status: "not_started",
          },
          {
            id: "r5d3",
            text: "Ensure scalability, security, maintainability and infrastructure efficiency.",
            status: "not_started",
          },
          {
            id: "r5d4",
            text: "Drive technical modernisation across existing platforms.",
            status: "not_started",
          },
        ],
      },
      {
        id: "r6",
        no: 6,
        title: "Engineering Process & SDLC Transformation",
        duties: [
          {
            id: "r6d1",
            text: "Lead improvements to SDLC including AI-assisted testing, UAT automation, deployment workflow and engineering governance.",
            status: "not_started",
          },
          {
            id: "r6d2",
            text: "Improve development environments, testing environments and release management practices.",
            status: "not_started",
          },
          {
            id: "r6d3",
            text: "Balance engineering quality with rapid delivery through AI-powered workflows.",
            status: "not_started",
          },
        ],
      },
      {
        id: "r7",
        no: 7,
        title: "Knowledge Sharing & Organisation AI Enablement",
        duties: [
          {
            id: "r7d1",
            text: "Coach software engineers on practical AI development techniques.",
            status: "not_started",
          },
          {
            id: "r7d2",
            text: "Share AI workflows with technical and non-technical teams where relevant.",
            status: "not_started",
          },
          {
            id: "r7d3",
            text: "Build internal capability for AI-assisted software development across the organisation.",
            status: "not_started",
          },
          {
            id: "r7d4",
            text: "Act as a change agent for the company's engineering transformation initiative, helping the team embrace new ways of working and overcome resistance to AI-driven transformation.",
            status: "not_started",
          },
        ],
      },
    ],
  };
}
