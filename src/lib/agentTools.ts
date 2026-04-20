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
