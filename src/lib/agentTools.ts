import 'server-only';
import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import { BasecampClient, BasecampError } from './basecamp';

// ────────────────────────── Risk model ──────────────────────────
//
// readonly    — listing, fetching. Always safe to run.
// write       — creates, posts, updates. Requires `confirmed: true`. Otherwise
//               the dispatcher returns a structured preview describing the
//               exact effect, without touching Basecamp.
// destructive — deletes, trashes, revokes. Same flow as `write`, but the
//               preview is flagged as irreversible so the agent *must* warn the
//               user. Server STILL refuses to execute without `confirmed: true`,
//               no matter what the prompt/model says — this is defense in depth.

type Risk = 'readonly' | 'write' | 'destructive';

export type ToolSpec = {
  name: string;
  risk: Risk;
  /** What the tool does, in Arabic — shown in the Claude tool description. */
  description: string;
  /** A plain-language Arabic effect statement, used for previews. */
  effect: (input: any) => string;
  /** JSON schema for Claude. `confirmed` added automatically for write/destructive. */
  schema: Record<string, any>;
  /** Zod validator for runtime tool input. */
  validator: z.ZodTypeAny;
  /** The actual call. */
  run: (input: any, client: BasecampClient) => Promise<unknown>;
};

const idSchema = z.number().int().positive();
const htmlContent = z.string().min(1).max(50_000);

const SPECS: ToolSpec[] = [
  // ───────── Projects ─────────
  {
    name: 'list_projects',
    risk: 'readonly',
    description:
      'اعرض مشاريع بيسكامب (نشطة/مؤرشفة/محذوفة) على الحساب المتصل. مثال: "اعرض مشاريعي النشطة".',
    effect: (i) => `سأعرض المشاريع بحالة ${i?.status ?? 'active'}.`,
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'archived', 'trashed'] },
      },
    },
    validator: z.object({ status: z.enum(['active', 'archived', 'trashed']).optional() }),
    run: (i, c) => c.listProjects(i.status ?? 'active'),
  },
  {
    name: 'get_project',
    risk: 'readonly',
    description:
      'اجلب مشروعاً واحداً مع لوحة الأدوات (dock) التي تحتوي على معرفات todoset / message_board / campfire. استخدمها قبل أي عملية داخل مشروع.',
    effect: (i) => `سأجلب تفاصيل المشروع رقم ${i.project_id}.`,
    schema: {
      type: 'object',
      properties: { project_id: { type: 'integer' } },
      required: ['project_id'],
    },
    validator: z.object({ project_id: idSchema }),
    run: (i, c) => c.getProject(i.project_id),
  },
  {
    name: 'create_project',
    risk: 'write',
    description:
      'أنشئ مشروعاً جديداً في الحساب. مثال: "أنشئ مشروعاً باسم موسم 5 لفريق الإنتاج".',
    effect: (i) =>
      `سأنشئ مشروعاً جديداً باسم «${i.name}»${i.description ? ` مع وصف: ${i.description}` : ''}.`,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 2000 },
      },
      required: ['name'],
    },
    validator: z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
    }),
    run: (i, c) => c.createProject(i.name, i.description),
  },
  {
    name: 'trash_project',
    risk: 'destructive',
    description:
      'انقل مشروعاً إلى سلة المحذوفات. إجراء يمكن استعادته خلال 30 يوماً فقط، وبعدها يُحذف نهائياً.',
    effect: (i) =>
      `سأُرسل المشروع رقم ${i.project_id} إلى سلة المحذوفات. يمكن استعادته خلال 30 يوماً.`,
    schema: {
      type: 'object',
      properties: { project_id: { type: 'integer' } },
      required: ['project_id'],
    },
    validator: z.object({ project_id: idSchema }),
    run: (i, c) => c.trashProject(i.project_id),
  },

  // ───────── People ─────────
  {
    name: 'list_people_in_account',
    risk: 'readonly',
    description: 'اعرض جميع الأشخاص على الحساب.',
    effect: () => 'سأعرض جميع الأعضاء على الحساب.',
    schema: { type: 'object', properties: {} },
    validator: z.object({}).passthrough(),
    run: (_i, c) => c.listPeopleInAccount(),
  },
  {
    name: 'list_people_in_project',
    risk: 'readonly',
    description: 'اعرض الأشخاص الذين لهم صلاحية الوصول لمشروع معين.',
    effect: (i) => `سأعرض أعضاء المشروع رقم ${i.project_id}.`,
    schema: {
      type: 'object',
      properties: { project_id: { type: 'integer' } },
      required: ['project_id'],
    },
    validator: z.object({ project_id: idSchema }),
    run: (i, c) => c.listPeopleInProject(i.project_id),
  },
  {
    name: 'grant_people_to_project',
    risk: 'write',
    description: 'أضف أشخاصاً إلى مشروع عبر معرفاتهم.',
    effect: (i) =>
      `سأضيف ${i.person_ids.length} شخصاً إلى المشروع رقم ${i.project_id}. سيرون كل المحتوى من لحظة الإضافة.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        person_ids: { type: 'array', items: { type: 'integer' }, minItems: 1 },
      },
      required: ['project_id', 'person_ids'],
    },
    validator: z.object({ project_id: idSchema, person_ids: z.array(idSchema).min(1).max(200) }),
    run: (i, c) => c.grantPeopleToProject(i.project_id, i.person_ids),
  },
  {
    name: 'revoke_people_from_project',
    risk: 'destructive',
    description: 'أزل صلاحية أشخاص من مشروع. لن يصلوا إلى المحتوى بعدها.',
    effect: (i) =>
      `سأُزيل صلاحية ${i.person_ids.length} شخصاً من المشروع رقم ${i.project_id}. سيفقدون الوصول مباشرة.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        person_ids: { type: 'array', items: { type: 'integer' }, minItems: 1 },
      },
      required: ['project_id', 'person_ids'],
    },
    validator: z.object({ project_id: idSchema, person_ids: z.array(idSchema).min(1).max(200) }),
    run: (i, c) => c.revokePeopleFromProject(i.project_id, i.person_ids),
  },
  {
    name: 'list_pingable_people',
    risk: 'readonly',
    description:
      'اعرض جميع الأشخاص القابلين للمراسلة (ping) في الحساب. مفيدة قبل إرسال رسالة مباشرة أو معرفة من متاح للتواصل.',
    effect: () => 'سأعرض الأشخاص القابلين للمراسلة.',
    schema: { type: 'object', properties: {} },
    validator: z.object({}).passthrough(),
    run: (_i, c) => c.listPingablePeople(),
  },
  {
    name: 'get_person',
    risk: 'readonly',
    description:
      'اجلب الملف الشخصي لشخص واحد عبر معرّفه (اسم، بريد، مسمّى وظيفي، شركة، نطاق زمني، صلاحيات).',
    effect: (i) => `سأجلب ملف الشخص ${i.person_id}.`,
    schema: {
      type: 'object',
      properties: { person_id: { type: 'integer' } },
      required: ['person_id'],
    },
    validator: z.object({ person_id: idSchema }),
    run: (i, c) => c.getPerson(i.person_id),
  },
  {
    name: 'find_person',
    risk: 'readonly',
    description:
      'ابحث عن شخص بالاسم أو البريد الإلكتروني. يعيد أفضل المطابقات مع معرفاتهم حتى تسأل المستخدم عن الشخص الصحيح إذا كان هناك تطابق متعدد. استخدمها قبل أي إجراء يتطلب person_id عندما يُذكر اسم فقط.',
    effect: (i) => `سأبحث عن «${i.query}» في الأشخاص.`,
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 200 },
        limit: { type: 'integer', minimum: 1, maximum: 25 },
      },
      required: ['query'],
    },
    validator: z.object({
      query: z.string().min(1).max(200),
      limit: z.number().int().positive().max(25).optional(),
    }),
    run: async (i, c) => {
      const q = i.query.trim().toLowerCase();
      const people = await c.listPeopleInAccount();
      const scored = people
        .map((p: any) => {
          const name = String(p?.name ?? '').toLowerCase();
          const email = String(p?.email_address ?? '').toLowerCase();
          const title = String(p?.title ?? '').toLowerCase();
          // Rough ranking: exact name > name prefix > name contains > email contains > title contains.
          let score = 0;
          if (name === q) score = 100;
          else if (name.startsWith(q)) score = 80;
          else if (name.includes(q)) score = 60;
          else if (email.includes(q)) score = 50;
          else if (title.includes(q)) score = 20;
          return { p, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);
      const limit = i.limit ?? 10;
      return {
        query: i.query,
        match_count: scored.length,
        candidates: scored.slice(0, limit).map(({ p, score }) => ({
          id: p.id,
          name: p.name,
          email_address: p.email_address,
          title: p.title ?? null,
          company: p.company?.name ?? null,
          avatar_url: p.avatar_url ?? null,
          score,
        })),
        note:
          scored.length === 0
            ? 'لا يوجد أي شخص يطابق البحث. اطلب من المستخدم اسماً آخر أو بريداً.'
            : scored.length === 1
              ? 'تطابق واحد فقط — يمكنك المتابعة بعد تأكيد المستخدم بسرعة.'
              : 'أكثر من مرشح — اعرض القائمة واطلب من المستخدم اختيار الشخص الصحيح قبل أي إجراء.',
      };
    },
  },
  {
    name: 'update_project_access',
    risk: 'destructive',
    description:
      'حدِّث صلاحية الوصول لمشروع: منح (grant) أو إزالة (revoke) لمعرفات موجودة، أو إنشاء (create) أشخاص جدد بالاسم والبريد. الإنشاء يضيف مستخدمين جدد للحساب ويرسل دعوات.',
    effect: (i) => {
      const parts: string[] = [];
      if (i.grant?.length) parts.push(`منح ${i.grant.length} شخصاً`);
      if (i.revoke?.length) parts.push(`إزالة ${i.revoke.length} شخصاً`);
      if (i.create?.length) parts.push(`إنشاء ${i.create.length} عضواً جديداً ودعوتهم`);
      return `في المشروع ${i.project_id}: ${parts.join(' و') || 'لا تغيير'}.`;
    },
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        grant: { type: 'array', items: { type: 'integer' } },
        revoke: { type: 'array', items: { type: 'integer' } },
        create: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 200 },
              email_address: { type: 'string', minLength: 3, maxLength: 320 },
              title: { type: 'string', maxLength: 200 },
              company_name: { type: 'string', maxLength: 200 },
            },
            required: ['name', 'email_address'],
          },
        },
      },
      required: ['project_id'],
    },
    validator: z
      .object({
        project_id: idSchema,
        grant: z.array(idSchema).max(200).optional(),
        revoke: z.array(idSchema).max(200).optional(),
        create: z
          .array(
            z.object({
              name: z.string().min(1).max(200),
              email_address: z.string().email().max(320),
              title: z.string().max(200).optional(),
              company_name: z.string().max(200).optional(),
            }),
          )
          .max(50)
          .optional(),
      })
      .refine((v) => (v.grant?.length ?? 0) + (v.revoke?.length ?? 0) + (v.create?.length ?? 0) > 0, {
        message: 'يجب تحديد grant أو revoke أو create واحداً على الأقل.',
      }),
    run: (i, c) =>
      c.updateProjectAccess(i.project_id, {
        grant: i.grant,
        revoke: i.revoke,
        create: i.create,
      }),
  },
  {
    name: 'person_activity_report',
    risk: 'readonly',
    description:
      'أنشئ تقريراً شاملاً عن نشاط شخص معين: ملفه الشخصي، المشاريع المشترك بها، المهام المُسندة (نشطة/متأخرة)، وإحصائيات أساسية. مرِّر person_id (استخدم find_person إن كان لديك الاسم فقط). يستبعد التعليقات بشكل افتراضي لأنها تتطلب استدعاءات إضافية.',
    effect: (i) =>
      `سأُجمِّع تقرير نشاط شامل عن الشخص ${i.person_id}${i.include_comments_from_projects?.length ? ` بما فيه عينة تعليقات من ${i.include_comments_from_projects.length} مشروعاً` : ''}.`,
    schema: {
      type: 'object',
      properties: {
        person_id: { type: 'integer' },
        include_comments_from_projects: {
          type: 'array',
          items: { type: 'integer' },
          description:
            'اختياري: قائمة معرفات مشاريع لجلب عينة تعليقات من رسائل/مهام الشخص. يزيد عدد الاستدعاءات — استخدمه باعتدال.',
        },
      },
      required: ['person_id'],
    },
    validator: z.object({
      person_id: idSchema,
      include_comments_from_projects: z.array(idSchema).max(5).optional(),
    }),
    run: async (i, c) => {
      const personId: number = i.person_id;
      // Fan out the three primary pulls in parallel. Each is allowed to fail
      // independently — a partial report is better than no report.
      const [profileR, assignmentsR, projectsR] = await Promise.allSettled([
        c.getPerson(personId),
        c.reportTodosAssignedToPerson(personId, 'bucket'),
        c.listProjects('active'),
      ]);

      const profile = profileR.status === 'fulfilled' ? profileR.value : null;
      const assignmentsPayload: any =
        assignmentsR.status === 'fulfilled' ? assignmentsR.value : null;
      const allProjects: any[] =
        projectsR.status === 'fulfilled' && Array.isArray(projectsR.value) ? projectsR.value : [];

      // Projects the person has access to — determined by listPeopleInProject
      // for a handful of active projects (capped to avoid N+1 blowups).
      const PROJECT_ACCESS_LOOKUP_CAP = 30;
      const lookupProjects = allProjects.slice(0, PROJECT_ACCESS_LOOKUP_CAP);
      const memberships = await Promise.allSettled(
        lookupProjects.map(async (p) => {
          const people = await c.listPeopleInProject(p.id);
          const hit = Array.isArray(people) ? people.find((x: any) => x?.id === personId) : null;
          return hit ? { id: p.id, name: p.name } : null;
        }),
      );
      const projectsOn = memberships
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter((x): x is { id: number; name: string } => x !== null);

      // Flatten the assignments grouped by bucket into a single list + per-project stats.
      const todosByProject: Record<string, { bucket_name: string; count: number; overdue: number; due_soon: number }> = {};
      let totalTodos = 0;
      let overdueCount = 0;
      let dueSoonCount = 0;
      const today = new Date().toISOString().slice(0, 10);
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const sampledTodos: Array<{ id: number; title: string; due_on: string | null; bucket: string }> = [];
      const buckets = assignmentsPayload?.todos ?? [];
      if (Array.isArray(buckets)) {
        for (const group of buckets) {
          const bucketName: string = group?.bucket?.name ?? group?.name ?? 'غير مُسمّى';
          const bucketKey = String(group?.bucket?.id ?? bucketName);
          const todos: any[] = Array.isArray(group?.todos) ? group.todos : [];
          let od = 0;
          let ds = 0;
          for (const t of todos) {
            totalTodos++;
            const due = t?.due_on ?? null;
            if (due && due < today) {
              overdueCount++;
              od++;
            } else if (due && due <= in7Days) {
              dueSoonCount++;
              ds++;
            }
            if (sampledTodos.length < 15) {
              sampledTodos.push({ id: t?.id, title: t?.title ?? t?.content ?? '(بلا عنوان)', due_on: due, bucket: bucketName });
            }
          }
          todosByProject[bucketKey] = { bucket_name: bucketName, count: todos.length, overdue: od, due_soon: ds };
        }
      }

      // Optional comments sample — only pulled when the caller asks for it.
      // For each requested project we grab its message_board's latest messages
      // and list comments on the first few, filtering to this person. Cheap but
      // shallow; the model can dig deeper with list_comments directly.
      const commentsSamples: Array<{
        project_id: number;
        project_name?: string;
        person_comments: Array<{ id: number; recording_id: number; created_at: string; excerpt: string }>;
      }> = [];
      const commentProjectIds: number[] = i.include_comments_from_projects ?? [];
      if (commentProjectIds.length) {
        for (const projectId of commentProjectIds) {
          try {
            const project = await c.getProject(projectId);
            const projectName = project?.name;
            const dock: any[] = Array.isArray(project?.dock) ? project.dock : [];
            const board = dock.find((d) => d?.name === 'message_board' && d?.enabled);
            const personComments: Array<{ id: number; recording_id: number; created_at: string; excerpt: string }> = [];
            if (board?.id) {
              const messages = await c.listMessages(projectId, board.id);
              const recentMessages = Array.isArray(messages) ? messages.slice(0, 5) : [];
              for (const msg of recentMessages) {
                try {
                  const comments = await c.listComments(projectId, msg.id);
                  if (Array.isArray(comments)) {
                    for (const cm of comments) {
                      if (cm?.creator?.id === personId) {
                        const raw = String(cm?.content ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                        personComments.push({
                          id: cm.id,
                          recording_id: msg.id,
                          created_at: cm.created_at,
                          excerpt: raw.slice(0, 200),
                        });
                      }
                    }
                  }
                } catch {
                  /* skip individual failures */
                }
                if (personComments.length >= 20) break;
              }
            }
            commentsSamples.push({ project_id: projectId, project_name: projectName, person_comments: personComments });
          } catch {
            commentsSamples.push({ project_id: projectId, person_comments: [] });
          }
        }
      }

      // Response interaction rate computed only from what we sampled.
      const sampledComments = commentsSamples.flatMap((s) => s.person_comments);
      const avgCommentLen = sampledComments.length
        ? Math.round(
            sampledComments.reduce((sum, c) => sum + c.excerpt.length, 0) / sampledComments.length,
          )
        : null;

      return {
        profile,
        projects: {
          checked: lookupProjects.length,
          total_active_on_account: allProjects.length,
          member_of: projectsOn,
          truncated: allProjects.length > PROJECT_ACCESS_LOOKUP_CAP,
        },
        todos: {
          total_active: totalTodos,
          overdue: overdueCount,
          due_within_7_days: dueSoonCount,
          by_project: Object.values(todosByProject),
          sample: sampledTodos,
        },
        comments_sample: commentsSamples,
        stats: {
          active_todos: totalTodos,
          overdue_todos: overdueCount,
          overdue_ratio: totalTodos ? Math.round((overdueCount / totalTodos) * 100) / 100 : 0,
          projects_member_of: projectsOn.length,
          sampled_comments: sampledComments.length,
          avg_comment_length_chars: avgCommentLen,
        },
        instruction:
          'قدِّم التقرير للمستخدم في جدول عربي مع عناوين واضحة: الملف الشخصي، المشاريع، المهام، ثم ملخص تحليلي قصير (معدّل المهام المتأخرة، المشاركة في التعليقات). إذا كان التعليقات فارغاً، اذكر أنه يمكن تحسين الدقة بتحديد مشاريع في include_comments_from_projects.',
      };
    },
  },
  {
    name: 'update_my_profile',
    risk: 'write',
    description: 'حدِّث الملف الشخصي للمستخدم الحالي (الاسم، المسمّى، النبذة، الموقع، المنطقة الزمنية…).',
    effect: (i) => `سأُحدّث حقول ملفي الشخصي: ${Object.keys(i).join('، ')}.`,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', maxLength: 200 },
        email_address: { type: 'string', maxLength: 320 },
        title: { type: 'string', maxLength: 200 },
        bio: { type: 'string', maxLength: 2000 },
        location: { type: 'string', maxLength: 200 },
        time_zone_name: { type: 'string', maxLength: 200 },
      },
    },
    validator: z
      .object({
        name: z.string().max(200).optional(),
        email_address: z.string().email().max(320).optional(),
        title: z.string().max(200).optional(),
        bio: z.string().max(2000).optional(),
        location: z.string().max(200).optional(),
        time_zone_name: z.string().max(200).optional(),
      })
      .refine((v) => Object.keys(v).length > 0, { message: 'لا توجد حقول للتحديث.' }),
    run: (i, c) => c.updateMyProfile(i),
  },
  {
    name: 'update_my_preferences',
    risk: 'write',
    description: 'حدِّث تفضيلات المستخدم الحالي: المنطقة الزمنية، أول أيام الأسبوع، نظام الوقت.',
    effect: (i) => `سأُحدّث تفضيلاتي: ${Object.keys(i).join('، ')}.`,
    schema: {
      type: 'object',
      properties: {
        time_zone_name: { type: 'string', maxLength: 200 },
        first_week_day: {
          type: 'string',
          enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        },
        time_format: { type: 'string', enum: ['twelve_hour', 'twenty_four_hour'] },
      },
    },
    validator: z
      .object({
        time_zone_name: z.string().max(200).optional(),
        first_week_day: z
          .enum(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
          .optional(),
        time_format: z.enum(['twelve_hour', 'twenty_four_hour']).optional(),
      })
      .refine((v) => Object.keys(v).length > 0, { message: 'لا توجد حقول للتحديث.' }),
    run: (i, c) => c.updateMyPreferences(i),
  },
  {
    name: 'my_preferences',
    risk: 'readonly',
    description: 'اعرض تفضيلات المستخدم الحالي (المنطقة الزمنية، نظام الوقت…).',
    effect: () => 'سأجلب تفضيلاتي.',
    schema: { type: 'object', properties: {} },
    validator: z.object({}).passthrough(),
    run: (_i, c) => c.myPreferences(),
  },

  // ───────── Todo sets & lists ─────────
  {
    name: 'list_todo_lists',
    risk: 'readonly',
    description: 'اعرض قوائم المهام داخل todoset لمشروع.',
    effect: (i) =>
      `سأعرض قوائم المهام للـ todoset رقم ${i.todoset_id} في المشروع ${i.project_id}.`,
    schema: {
      type: 'object',
      properties: { project_id: { type: 'integer' }, todoset_id: { type: 'integer' } },
      required: ['project_id', 'todoset_id'],
    },
    validator: z.object({ project_id: idSchema, todoset_id: idSchema }),
    run: (i, c) => c.listTodoLists(i.project_id, i.todoset_id),
  },
  {
    name: 'create_todo_list',
    risk: 'write',
    description: 'أنشئ قائمة مهام جديدة داخل مشروع.',
    effect: (i) => `سأنشئ قائمة مهام جديدة باسم «${i.name}» داخل المشروع ${i.project_id}.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        todoset_id: { type: 'integer' },
        name: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 2000 },
      },
      required: ['project_id', 'todoset_id', 'name'],
    },
    validator: z.object({
      project_id: idSchema,
      todoset_id: idSchema,
      name: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
    }),
    run: (i, c) => c.createTodoList(i.project_id, i.todoset_id, i.name, i.description),
  },

  // ───────── Todos ─────────
  {
    name: 'list_todos',
    risk: 'readonly',
    description: 'اعرض مهام قائمة معينة (active أو completed).',
    effect: (i) =>
      `سأعرض مهام القائمة ${i.todolist_id} بحالة ${i.status ?? 'active'}.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        todolist_id: { type: 'integer' },
        status: { type: 'string', enum: ['active', 'completed'] },
      },
      required: ['project_id', 'todolist_id'],
    },
    validator: z.object({
      project_id: idSchema,
      todolist_id: idSchema,
      status: z.enum(['active', 'completed']).optional(),
    }),
    run: (i, c) => c.listTodos(i.project_id, i.todolist_id, i.status ?? 'active'),
  },
  {
    name: 'get_todo',
    risk: 'readonly',
    description: 'اجلب تفاصيل مهمة واحدة بكامل حقولها.',
    effect: (i) => `سأجلب تفاصيل المهمة ${i.todo_id}.`,
    schema: {
      type: 'object',
      properties: { project_id: { type: 'integer' }, todo_id: { type: 'integer' } },
      required: ['project_id', 'todo_id'],
    },
    validator: z.object({ project_id: idSchema, todo_id: idSchema }),
    run: (i, c) => c.getTodo(i.project_id, i.todo_id),
  },
  {
    name: 'create_todo',
    risk: 'write',
    description:
      'أنشئ مهمة جديدة في قائمة مهام. يمكن إسنادها لأشخاص وإرسال إشعار وتحديد تاريخ استحقاق.',
    effect: (i) => {
      const parts: string[] = [`سأنشئ مهمة «${i.content}» في القائمة ${i.todolist_id}`];
      if (i.assignee_ids?.length) parts.push(`مسندة لـ ${i.assignee_ids.length} شخصاً`);
      if (i.due_on) parts.push(`تستحق ${i.due_on}`);
      if (i.notify) parts.push('مع إرسال إشعار للمسندين');
      return parts.join('، ') + '.';
    },
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        todolist_id: { type: 'integer' },
        content: { type: 'string', minLength: 1, maxLength: 2000 },
        description: { type: 'string', maxLength: 50_000 },
        assignee_ids: { type: 'array', items: { type: 'integer' } },
        due_on: { type: 'string', description: 'YYYY-MM-DD' },
        notify: { type: 'boolean' },
      },
      required: ['project_id', 'todolist_id', 'content'],
    },
    validator: z.object({
      project_id: idSchema,
      todolist_id: idSchema,
      content: z.string().min(1).max(2000),
      description: z.string().max(50_000).optional(),
      assignee_ids: z.array(idSchema).max(500).optional(),
      due_on: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      notify: z.boolean().optional(),
    }),
    run: (i, c) =>
      c.createTodo(i.project_id, i.todolist_id, i.content, {
        description: i.description,
        assignee_ids: i.assignee_ids,
        due_on: i.due_on,
        notify: i.notify,
      }),
  },
  {
    name: 'complete_todo',
    risk: 'write',
    description: 'علِّم مهمة كمُنجَزة.',
    effect: (i) => `سأُغلق المهمة ${i.todo_id} في المشروع ${i.project_id}.`,
    schema: {
      type: 'object',
      properties: { project_id: { type: 'integer' }, todo_id: { type: 'integer' } },
      required: ['project_id', 'todo_id'],
    },
    validator: z.object({ project_id: idSchema, todo_id: idSchema }),
    run: (i, c) => c.completeTodo(i.project_id, i.todo_id),
  },
  {
    name: 'reopen_todo',
    risk: 'write',
    description: 'أعِد فتح مهمة مُنجَزة.',
    effect: (i) => `سأُعيد فتح المهمة ${i.todo_id}.`,
    schema: {
      type: 'object',
      properties: { project_id: { type: 'integer' }, todo_id: { type: 'integer' } },
      required: ['project_id', 'todo_id'],
    },
    validator: z.object({ project_id: idSchema, todo_id: idSchema }),
    run: (i, c) => c.reopenTodo(i.project_id, i.todo_id),
  },
  {
    name: 'update_todo',
    risk: 'write',
    description: 'حدِّث حقول مهمة (المحتوى، الوصف، المسندون، تاريخ الاستحقاق…).',
    effect: (i) =>
      `سأُحدّث حقول المهمة ${i.todo_id}: ${Object.keys(i.patch ?? {}).join('، ') || 'لا شيء'}.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        todo_id: { type: 'integer' },
        patch: { type: 'object', additionalProperties: true },
      },
      required: ['project_id', 'todo_id', 'patch'],
    },
    validator: z.object({
      project_id: idSchema,
      todo_id: idSchema,
      patch: z.record(z.any()),
    }),
    run: (i, c) => c.updateTodo(i.project_id, i.todo_id, i.patch),
  },
  {
    name: 'trash_todo',
    risk: 'destructive',
    description: 'انقل مهمة إلى سلة المحذوفات. يمكن استعادتها خلال 30 يوماً.',
    effect: (i) =>
      `سأُرسل المهمة ${i.todo_id} إلى سلة المحذوفات. قابلة للاستعادة 30 يوماً.`,
    schema: {
      type: 'object',
      properties: { project_id: { type: 'integer' }, todo_id: { type: 'integer' } },
      required: ['project_id', 'todo_id'],
    },
    validator: z.object({ project_id: idSchema, todo_id: idSchema }),
    run: (i, c) => c.trashTodo(i.project_id, i.todo_id),
  },

  // ───────── Messages & Comments ─────────
  {
    name: 'list_messages',
    risk: 'readonly',
    description: 'اعرض رسائل لوحة رسائل المشروع.',
    effect: (i) => `سأعرض آخر رسائل لوحة ${i.board_id}.`,
    schema: {
      type: 'object',
      properties: { project_id: { type: 'integer' }, board_id: { type: 'integer' } },
      required: ['project_id', 'board_id'],
    },
    validator: z.object({ project_id: idSchema, board_id: idSchema }),
    run: (i, c) => c.listMessages(i.project_id, i.board_id),
  },
  {
    name: 'post_message',
    risk: 'write',
    description: 'انشر رسالة جديدة على لوحة رسائل المشروع.',
    effect: (i) =>
      `سأنشر رسالة «${i.subject}» على لوحة ${i.board_id}${i.status === 'draft' ? ' كمسودة' : ' (ستصل إشعارات)'}.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        board_id: { type: 'integer' },
        subject: { type: 'string', minLength: 1, maxLength: 300 },
        content: { type: 'string', minLength: 1, maxLength: 50_000 },
        status: { type: 'string', enum: ['active', 'draft'] },
      },
      required: ['project_id', 'board_id', 'subject', 'content'],
    },
    validator: z.object({
      project_id: idSchema,
      board_id: idSchema,
      subject: z.string().min(1).max(300),
      content: htmlContent,
      status: z.enum(['active', 'draft']).optional(),
    }),
    run: (i, c) =>
      c.postMessage(i.project_id, i.board_id, i.subject, i.content, i.status ?? 'active'),
  },
  {
    name: 'list_comments',
    risk: 'readonly',
    description: 'اعرض التعليقات على تسجيل (مهمة، رسالة، مستند…).',
    effect: (i) => `سأعرض التعليقات على التسجيل ${i.recording_id}.`,
    schema: {
      type: 'object',
      properties: { project_id: { type: 'integer' }, recording_id: { type: 'integer' } },
      required: ['project_id', 'recording_id'],
    },
    validator: z.object({ project_id: idSchema, recording_id: idSchema }),
    run: (i, c) => c.listComments(i.project_id, i.recording_id),
  },
  {
    name: 'post_comment',
    risk: 'write',
    description: 'أضف تعليقاً على تسجيل داخل مشروع.',
    effect: (i) =>
      `سأضيف تعليقاً على التسجيل ${i.recording_id} (${i.content.length} حرفاً).`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        recording_id: { type: 'integer' },
        content: { type: 'string', minLength: 1, maxLength: 50_000 },
      },
      required: ['project_id', 'recording_id', 'content'],
    },
    validator: z.object({
      project_id: idSchema,
      recording_id: idSchema,
      content: htmlContent,
    }),
    run: (i, c) => c.postComment(i.project_id, i.recording_id, i.content),
  },

  // ───────── Card Tables (Kanban) ─────────
  {
    name: 'get_card_table',
    risk: 'readonly',
    description:
      'اجلب لوحة كانبان (card_table) مع قوائم/أعمدة الكانبان الخاصة بها. استخدمها بعد get_project للحصول على معرف card_table من الـ dock.',
    effect: (i) => `سأجلب لوحة الكانبان ${i.card_table_id} في المشروع ${i.project_id}.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        card_table_id: { type: 'integer' },
      },
      required: ['project_id', 'card_table_id'],
    },
    validator: z.object({ project_id: idSchema, card_table_id: idSchema }),
    run: (i, c) => c.getCardTable(i.project_id, i.card_table_id),
  },
  {
    name: 'list_cards_in_column',
    risk: 'readonly',
    description: 'اعرض البطاقات داخل عمود معين في لوحة كانبان.',
    effect: (i) => `سأعرض بطاقات العمود ${i.column_id}.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        column_id: { type: 'integer' },
      },
      required: ['project_id', 'column_id'],
    },
    validator: z.object({ project_id: idSchema, column_id: idSchema }),
    run: (i, c) => c.listCardsInColumn(i.project_id, i.column_id),
  },
  {
    name: 'get_card',
    risk: 'readonly',
    description: 'اجلب بطاقة كانبان واحدة بكامل حقولها بما في ذلك الخطوات (steps).',
    effect: (i) => `سأجلب البطاقة ${i.card_id}.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        card_id: { type: 'integer' },
      },
      required: ['project_id', 'card_id'],
    },
    validator: z.object({ project_id: idSchema, card_id: idSchema }),
    run: (i, c) => c.getCard(i.project_id, i.card_id),
  },
  {
    name: 'create_card',
    risk: 'write',
    description:
      'أنشئ بطاقة جديدة داخل عمود كانبان. يمكن تحديد تاريخ استحقاق وإرسال إشعار.',
    effect: (i) => {
      const parts: string[] = [`سأنشئ بطاقة «${i.title}» في العمود ${i.column_id}`];
      if (i.due_on) parts.push(`تستحق ${i.due_on}`);
      if (i.notify) parts.push('مع إرسال إشعار');
      return parts.join('، ') + '.';
    },
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        column_id: { type: 'integer' },
        title: { type: 'string', minLength: 1, maxLength: 300 },
        content: { type: 'string', maxLength: 50_000 },
        due_on: { type: 'string', description: 'YYYY-MM-DD' },
        notify: { type: 'boolean' },
      },
      required: ['project_id', 'column_id', 'title'],
    },
    validator: z.object({
      project_id: idSchema,
      column_id: idSchema,
      title: z.string().min(1).max(300),
      content: z.string().max(50_000).optional(),
      due_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      notify: z.boolean().optional(),
    }),
    run: (i, c) =>
      c.createCard(i.project_id, i.column_id, i.title, {
        content: i.content,
        due_on: i.due_on,
        notify: i.notify,
      }),
  },
  {
    name: 'update_card',
    risk: 'write',
    description: 'حدِّث حقول بطاقة كانبان (العنوان، المحتوى، المسندون، تاريخ الاستحقاق…).',
    effect: (i) =>
      `سأُحدّث حقول البطاقة ${i.card_id}: ${Object.keys(i.patch ?? {}).join('، ') || 'لا شيء'}.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        card_id: { type: 'integer' },
        patch: { type: 'object', additionalProperties: true },
      },
      required: ['project_id', 'card_id', 'patch'],
    },
    validator: z.object({
      project_id: idSchema,
      card_id: idSchema,
      patch: z.record(z.any()),
    }),
    run: (i, c) => c.updateCard(i.project_id, i.card_id, i.patch),
  },
  {
    name: 'move_card',
    risk: 'write',
    description: 'انقل بطاقة كانبان إلى عمود آخر وفي موقع محدد (1-مفهرس).',
    effect: (i) =>
      `سأنقل البطاقة ${i.card_id} إلى العمود ${i.column_id}${i.position ? ` في الموقع ${i.position}` : ''}.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        card_id: { type: 'integer' },
        column_id: { type: 'integer' },
        position: { type: 'integer', minimum: 1 },
      },
      required: ['project_id', 'card_id', 'column_id'],
    },
    validator: z.object({
      project_id: idSchema,
      card_id: idSchema,
      column_id: idSchema,
      position: z.number().int().positive().optional(),
    }),
    run: (i, c) => c.moveCard(i.project_id, i.card_id, i.column_id, i.position),
  },
  {
    name: 'get_card_column',
    risk: 'readonly',
    description: 'اجلب عموداً واحداً من لوحة كانبان بكامل حقوله.',
    effect: (i) => `سأجلب العمود ${i.column_id}.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        column_id: { type: 'integer' },
      },
      required: ['project_id', 'column_id'],
    },
    validator: z.object({ project_id: idSchema, column_id: idSchema }),
    run: (i, c) => c.getCardColumn(i.project_id, i.column_id),
  },
  {
    name: 'create_card_column',
    risk: 'write',
    description: 'أنشئ عموداً جديداً في لوحة كانبان.',
    effect: (i) => `سأنشئ عموداً باسم «${i.title}» في اللوحة ${i.card_table_id}.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        card_table_id: { type: 'integer' },
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 2000 },
      },
      required: ['project_id', 'card_table_id', 'title'],
    },
    validator: z.object({
      project_id: idSchema,
      card_table_id: idSchema,
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
    }),
    run: (i, c) => c.createCardColumn(i.project_id, i.card_table_id, i.title, i.description),
  },
  {
    name: 'update_card_column',
    risk: 'write',
    description: 'حدِّث حقول عمود كانبان (العنوان، الوصف…).',
    effect: (i) =>
      `سأُحدّث العمود ${i.column_id}: ${Object.keys(i.patch ?? {}).join('، ') || 'لا شيء'}.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        column_id: { type: 'integer' },
        patch: { type: 'object', additionalProperties: true },
      },
      required: ['project_id', 'column_id', 'patch'],
    },
    validator: z.object({
      project_id: idSchema,
      column_id: idSchema,
      patch: z.record(z.any()),
    }),
    run: (i, c) => c.updateCardColumn(i.project_id, i.column_id, i.patch),
  },
  {
    name: 'set_column_on_hold',
    risk: 'write',
    description: 'فعِّل أو ألغِ قسم «قيد الانتظار» (on hold) في عمود كانبان.',
    effect: (i) =>
      `${i.on_hold ? 'سأُفعِّل' : 'سألغي'} قسم قيد الانتظار في العمود ${i.column_id}.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        column_id: { type: 'integer' },
        on_hold: { type: 'boolean' },
      },
      required: ['project_id', 'column_id', 'on_hold'],
    },
    validator: z.object({ project_id: idSchema, column_id: idSchema, on_hold: z.boolean() }),
    run: (i, c) => c.setColumnOnHold(i.project_id, i.column_id, i.on_hold),
  },
  {
    name: 'set_column_color',
    risk: 'write',
    description:
      'غيِّر لون عمود كانبان. الألوان المتاحة: white, red, orange, yellow, green, blue, aqua, purple, gray, pink, brown.',
    effect: (i) => `سأُغيِّر لون العمود ${i.column_id} إلى ${i.color}.`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        column_id: { type: 'integer' },
        color: {
          type: 'string',
          enum: ['white', 'red', 'orange', 'yellow', 'green', 'blue', 'aqua', 'purple', 'gray', 'pink', 'brown'],
        },
      },
      required: ['project_id', 'column_id', 'color'],
    },
    validator: z.object({
      project_id: idSchema,
      column_id: idSchema,
      color: z.enum(['white', 'red', 'orange', 'yellow', 'green', 'blue', 'aqua', 'purple', 'gray', 'pink', 'brown']),
    }),
    run: (i, c) => c.setColumnColor(i.project_id, i.column_id, i.color),
  },

  // ───────── Campfire ─────────
  {
    name: 'list_campfires',
    risk: 'readonly',
    description: 'اعرض غرف Campfire عبر المشاريع.',
    effect: () => 'سأعرض جميع غرف Campfire المتاحة.',
    schema: { type: 'object', properties: {} },
    validator: z.object({}).passthrough(),
    run: (_i, c) => c.listCampfires(),
  },
  {
    name: 'post_campfire_line',
    risk: 'write',
    description: 'أرسل سطراً نصياً إلى Campfire لمشروع معين.',
    effect: (i) =>
      `سأرسل سطراً في Campfire ${i.campfire_id}: «${i.content.slice(0, 80)}${i.content.length > 80 ? '…' : ''}».`,
    schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        campfire_id: { type: 'integer' },
        content: { type: 'string', minLength: 1, maxLength: 10_000 },
      },
      required: ['project_id', 'campfire_id', 'content'],
    },
    validator: z.object({
      project_id: idSchema,
      campfire_id: idSchema,
      content: z.string().min(1).max(10_000),
    }),
    run: (i, c) => c.postCampfireLine(i.project_id, i.campfire_id, i.content),
  },

  // ───────── Personal ─────────
  {
    name: 'my_schedule',
    risk: 'readonly',
    description: 'جلب جدول المستخدم الحالي.',
    effect: () => 'سأجلب جدولي الحالي.',
    schema: { type: 'object', properties: {} },
    validator: z.object({}).passthrough(),
    run: (_i, c) => c.mySchedule(),
  },
  {
    name: 'my_assignments',
    risk: 'readonly',
    description: 'جلب المهام المسندة إلى المستخدم الحالي.',
    effect: () => 'سأجلب المهام المسندة إليّ.',
    schema: { type: 'object', properties: {} },
    validator: z.object({}).passthrough(),
    run: (_i, c) => c.myAssignments(),
  },
  {
    name: 'my_overdue',
    risk: 'readonly',
    description:
      'جلب كل المهام المتأخرة عبر المشاريع، مُجمَّعة حسب درجة التأخير (under_a_week_late / over_a_week_late / over_a_month_late / over_three_months_late).',
    effect: () => 'سأجلب المهام المتأخرة.',
    schema: { type: 'object', properties: {} },
    validator: z.object({}).passthrough(),
    run: (_i, c) => c.myOverdue(),
  },
  {
    name: 'my_assignments_due',
    risk: 'readonly',
    description:
      'جلب المهام المسندة إليّ المفلترة حسب نطاق تاريخ الاستحقاق (overdue افتراضياً).',
    effect: (i) => `سأجلب مهامي بنطاق ${i?.scope ?? 'overdue'}.`,
    schema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['overdue', 'due_today', 'due_tomorrow', 'due_later_this_week', 'due_next_week', 'due_later'],
        },
      },
    },
    validator: z.object({
      scope: z
        .enum(['overdue', 'due_today', 'due_tomorrow', 'due_later_this_week', 'due_next_week', 'due_later'])
        .optional(),
    }),
    run: (i, c) => c.myAssignmentsDue(i.scope ?? 'overdue'),
  },
  {
    name: 'my_assignments_completed',
    risk: 'readonly',
    description: 'جلب المهام المُنجَزة المسندة إليّ.',
    effect: () => 'سأجلب المهام المُنجَزة المسندة إليّ.',
    schema: { type: 'object', properties: {} },
    validator: z.object({}).passthrough(),
    run: (_i, c) => c.myAssignmentsCompleted(),
  },
  {
    name: 'report_todos_assignable',
    risk: 'readonly',
    description:
      'اعرض قائمة الأشخاص الذين يمكن إسناد مهام لهم — مفيدة كخطوة تمهيدية قبل report_todos_assigned_to_person.',
    effect: () => 'سأعرض الأشخاص الذين يمكن إسناد مهام لهم.',
    schema: { type: 'object', properties: {} },
    validator: z.object({}).passthrough(),
    run: (_i, c) => c.reportTodosAssignable(),
  },
  {
    name: 'report_todos_assigned_to_person',
    risk: 'readonly',
    description:
      'اعرض جميع المهام النشطة المسندة لشخص معين عبر المشاريع، مُجمَّعة حسب المشروع (bucket) أو حسب تاريخ الاستحقاق (date).',
    effect: (i) =>
      `سأعرض مهام الشخص ${i.person_id} مُجمَّعة حسب ${i.group_by ?? 'bucket'}.`,
    schema: {
      type: 'object',
      properties: {
        person_id: { type: 'integer' },
        group_by: { type: 'string', enum: ['bucket', 'date'] },
      },
      required: ['person_id'],
    },
    validator: z.object({
      person_id: idSchema,
      group_by: z.enum(['bucket', 'date']).optional(),
    }),
    run: (i, c) => c.reportTodosAssignedToPerson(i.person_id, i.group_by ?? 'bucket'),
  },
];

function withConfirmed(schema: Record<string, any>, risk: Risk): Record<string, any> {
  if (risk === 'readonly') return schema;
  const properties = { ...(schema.properties ?? {}) };
  properties.confirmed = {
    type: 'boolean',
    description:
      risk === 'destructive'
        ? 'أرسلها كـ true فقط بعد أن يوافق المستخدم صراحةً على هذا الإجراء الذي لا يمكن التراجع عنه بسهولة.'
        : 'أرسلها كـ true فقط بعد موافقة المستخدم الصريحة.',
  };
  return { ...schema, properties };
}

export const TOOL_SPECS = SPECS;

export const AGENT_TOOLS: Anthropic.Tool[] = SPECS.map((s) => ({
  name: s.name,
  description:
    s.risk === 'readonly'
      ? s.description
      : `${s.description}\n\n⚠ هذا الإجراء ${s.risk === 'destructive' ? 'لا يمكن التراجع عنه بسهولة' : 'يُحدث تغييراً'}. استدعِه أولاً دون confirmed لتحصل على معاينة، اعرضها للمستخدم واطلب تأكيده، ثم أعد الاستدعاء مع confirmed=true.`,
  input_schema: withConfirmed(s.schema, s.risk) as any,
}));

export function findSpec(name: string): ToolSpec | undefined {
  return SPECS.find((s) => s.name === name);
}

export type DispatchResult =
  | { kind: 'ok'; output: unknown }
  | { kind: 'preview'; risk: Risk; effect: string; warning?: string }
  | { kind: 'error'; message: string; detail?: string; httpStatus?: number };

export async function dispatchTool(
  name: string,
  rawInput: unknown,
  client: BasecampClient,
): Promise<DispatchResult> {
  const spec = findSpec(name);
  if (!spec) {
    return { kind: 'error', message: `أداة غير معروفة: ${name}` };
  }

  // Strip `confirmed` from model input before validating the domain schema.
  const { confirmed, ...toolInput } = (rawInput ?? {}) as Record<string, any>;

  const parsed = spec.validator.safeParse(toolInput);
  if (!parsed.success) {
    return {
      kind: 'error',
      message: `مدخلات غير صالحة لـ ${name}`,
      detail: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('؛ '),
    };
  }
  const input = parsed.data as any;

  // Server-enforced safety gate.
  if (spec.risk !== 'readonly' && confirmed !== true) {
    return {
      kind: 'preview',
      risk: spec.risk,
      effect: spec.effect(input),
      warning:
        spec.risk === 'destructive'
          ? 'هذا إجراء لا يمكن التراجع عنه بسهولة. لا تُنفّذ دون تأكيد صريح من المستخدم.'
          : undefined,
    };
  }

  try {
    const output = await spec.run(input, client);
    return { kind: 'ok', output };
  } catch (err) {
    if (err instanceof BasecampError) {
      return {
        kind: 'error',
        message: err.arabicMessage,
        detail: err.message,
        httpStatus: err.status,
      };
    }
    return {
      kind: 'error',
      message: err instanceof Error ? err.message : 'خطأ غير معروف',
    };
  }
}
