import { nanoid } from "nanoid";
import type { CurrentUser } from "./auth";
import { GROUP_COLORS } from "./constants";
import type { Board, Contact, Group, Member, Task } from "./types";
import { pickAvatarColor } from "./utils";

function nowIso() {
  return new Date().toISOString();
}

export function makeSampleBoard(
  currentUserId: string,
  currentUser: CurrentUser | null,
): Board {
  const now = nowIso();
  const inDays = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString();
  };
  const groupA: Group = {
    id: nanoid(8),
    name: "This week",
    color: GROUP_COLORS[0],
  };
  const groupB: Group = {
    id: nanoid(8),
    name: "Next week",
    color: GROUP_COLORS[1],
  };
  const groupC: Group = {
    id: nanoid(8),
    name: "Backlog",
    color: GROUP_COLORS[3],
  };

  const me: Member = currentUser
    ? {
        id: currentUserId,
        authUserId: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatarColor: pickAvatarColor(currentUser.email),
        avatarUrl: currentUser.avatarUrl ?? null,
        role: "owner",
      }
    : {
        id: currentUserId,
        name: "You",
        email: "you@momentum.app",
        avatarColor: pickAvatarColor(currentUserId),
        role: "owner",
      };
  const alex: Member = {
    id: nanoid(8),
    name: "Alex Rivera",
    email: "alex@momentum.app",
    avatarColor: pickAvatarColor("alex"),
    role: "admin",
  };
  const sam: Member = {
    id: nanoid(8),
    name: "Sam Chen",
    email: "sam@momentum.app",
    avatarColor: pickAvatarColor("sam"),
    role: "member",
  };

  // Contact directory seeds: one requester with a WhatsApp-able phone,
  // one without (exercises the "no notification prompt" path).
  const jordan: Contact = {
    id: nanoid(8),
    name: "Jordan Lee",
    phone: "+1 555 010 4477",
    email: "jordan@client.example",
  };
  const priya: Contact = {
    id: nanoid(8),
    name: "Priya Patel",
    phone: null,
    email: "priya@client.example",
  };

  const tasks: Task[] = [
    {
      id: nanoid(8),
      title: "Design landing page hero",
      description: "Mockup three options and review with the team.",
      status: "in_progress",
      priority: "high",
      assigneeIds: [alex.id],
      startDate: inDays(-1),
      dueDate: inDays(2),
      tags: ["design", "marketing"],
      groupId: groupA.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(8),
      title: "Set up CI pipeline",
      status: "review",
      priority: "medium",
      requesterId: jordan.id,
      assigneeIds: [me.id, sam.id],
      startDate: inDays(0),
      dueDate: inDays(3),
      tags: ["infra"],
      groupId: groupA.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(8),
      title: "Write onboarding emails",
      status: "not_started",
      priority: "low",
      assigneeIds: [sam.id],
      startDate: inDays(4),
      dueDate: inDays(8),
      tags: ["growth"],
      groupId: groupB.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(8),
      title: "Investigate Sentry alerts",
      status: "stuck",
      priority: "critical",
      assigneeIds: [me.id],
      startDate: inDays(-2),
      dueDate: inDays(1),
      tags: ["bug"],
      groupId: groupA.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(8),
      title: "Q3 roadmap workshop",
      status: "not_started",
      priority: "medium",
      assigneeIds: [me.id, alex.id, sam.id],
      startDate: inDays(10),
      dueDate: inDays(11),
      tags: ["planning"],
      groupId: groupB.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(8),
      title: "Mobile responsive audit",
      status: "done",
      priority: "low",
      assigneeIds: [alex.id],
      tags: ["design"],
      groupId: groupC.id,
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    id: nanoid(8),
    name: "Product launch",
    description: "Cross-functional plan for the v1 launch.",
    emoji: "🚀",
    view: "kanban",
    groups: [groupA, groupB, groupC],
    tasks,
    members: [me, alex, sam],
    contacts: [jordan, priya],
    createdAt: now,
    updatedAt: now,
  };
}
