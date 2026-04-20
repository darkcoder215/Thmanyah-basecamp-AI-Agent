import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { BasecampClient } from './basecamp';

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_projects',
    description: 'اعرض مشاريع بيسكامب النشطة (أو المؤرشفة / المحذوفة) على الحساب المتصل.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'archived', 'trashed'],
          description: 'حالة المشاريع المطلوبة. الافتراضي active.',
        },
      },
    },
  },
  {
    name: 'get_project',
    description: 'اجلب مشروعاً واحداً مع لوحة الأدوات (dock) لمعرفة أرقام التو‌دوسِت ولوح الرسائل والكامبفاير.',
    input_schema: {
      type: 'object',
      properties: { project_id: { type: 'integer' } },
      required: ['project_id'],
    },
  },
  {
    name: 'create_project',
    description: 'أنشئ مشروعاً جديداً. يتطلب تأكيد المستخدم قبل الاستدعاء.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_people_in_account',
    description: 'اعرض كل الأشخاص المرتبطين بالحساب.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'list_people_in_project',
    description: 'اعرض الأشخاص الذين لهم صلاحية الوصول إلى مشروع معين.',
    input_schema: {
      type: 'object',
      properties: { project_id: { type: 'integer' } },
      required: ['project_id'],
    },
  },
  {
    name: 'grant_people_to_project',
    description: 'أضف أشخاصاً إلى مشروع عبر معرفاتهم. يتطلب تأكيداً.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        person_ids: { type: 'array', items: { type: 'integer' } },
      },
      required: ['project_id', 'person_ids'],
    },
  },
  {
    name: 'revoke_people_from_project',
    description: 'أزل صلاحية أشخاص من مشروع. يتطلب تأكيداً.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        person_ids: { type: 'array', items: { type: 'integer' } },
      },
      required: ['project_id', 'person_ids'],
    },
  },
  {
    name: 'list_todo_lists',
    description: 'اعرض قوائم المهام داخل todoset معين للمشروع.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        todoset_id: { type: 'integer' },
      },
      required: ['project_id', 'todoset_id'],
    },
  },
  {
    name: 'create_todo_list',
    description: 'أنشئ قائمة مهام جديدة داخل مشروع.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        todoset_id: { type: 'integer' },
        name: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['project_id', 'todoset_id', 'name'],
    },
  },
  {
    name: 'list_todos',
    description: 'اعرض مهام قائمة معينة (active أو completed).',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        todolist_id: { type: 'integer' },
        status: { type: 'string', enum: ['active', 'completed'] },
      },
      required: ['project_id', 'todolist_id'],
    },
  },
  {
    name: 'create_todo',
    description: 'أضف مهمة جديدة إلى قائمة مهام داخل مشروع. يمكن إسنادها لأشخاص وتحديد تاريخ استحقاق.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        todolist_id: { type: 'integer' },
        content: { type: 'string', description: 'نص المهمة.' },
        description: { type: 'string', description: 'وصف HTML اختياري.' },
        assignee_ids: { type: 'array', items: { type: 'integer' } },
        due_on: { type: 'string', description: 'YYYY-MM-DD.' },
        notify: { type: 'boolean' },
      },
      required: ['project_id', 'todolist_id', 'content'],
    },
  },
  {
    name: 'complete_todo',
    description: 'علِّم مهمة كمُنجَزة.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        todo_id: { type: 'integer' },
      },
      required: ['project_id', 'todo_id'],
    },
  },
  {
    name: 'reopen_todo',
    description: 'أعِد فتح مهمة مُنجَزة.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        todo_id: { type: 'integer' },
      },
      required: ['project_id', 'todo_id'],
    },
  },
  {
    name: 'update_todo',
    description: 'حدِّث حقول مهمة (المحتوى، المسندون، تاريخ الاستحقاق…).',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        todo_id: { type: 'integer' },
        patch: { type: 'object', additionalProperties: true },
      },
      required: ['project_id', 'todo_id', 'patch'],
    },
  },
  {
    name: 'list_messages',
    description: 'اعرض رسائل لوحة رسائل المشروع.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        board_id: { type: 'integer' },
      },
      required: ['project_id', 'board_id'],
    },
  },
  {
    name: 'post_message',
    description: 'انشر رسالة جديدة على لوحة رسائل المشروع.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        board_id: { type: 'integer' },
        subject: { type: 'string' },
        content: { type: 'string', description: 'محتوى HTML.' },
        status: { type: 'string', enum: ['active', 'draft'] },
      },
      required: ['project_id', 'board_id', 'subject', 'content'],
    },
  },
  {
    name: 'list_comments',
    description: 'اعرض التعليقات على تسجيل (مهمة، رسالة، مستند…).',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        recording_id: { type: 'integer' },
      },
      required: ['project_id', 'recording_id'],
    },
  },
  {
    name: 'post_comment',
    description: 'أضف تعليقاً على تسجيل داخل مشروع.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        recording_id: { type: 'integer' },
        content: { type: 'string', description: 'محتوى HTML.' },
      },
      required: ['project_id', 'recording_id', 'content'],
    },
  },
  {
    name: 'list_campfires',
    description: 'اعرض غرف المحادثة (Campfires) المتاحة عبر المشاريع.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'post_campfire_line',
    description: 'أرسل سطراً نصياً إلى Campfire لمشروع معين.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'integer' },
        campfire_id: { type: 'integer' },
        content: { type: 'string' },
      },
      required: ['project_id', 'campfire_id', 'content'],
    },
  },
  {
    name: 'my_schedule',
    description: 'جلب جدول المستخدم الحالي.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'my_assignments',
    description: 'جلب المهام المسندة إلى المستخدم الحالي.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'my_overdue',
    description: 'جلب المهام المتأخرة للمستخدم الحالي.',
    input_schema: { type: 'object', properties: {} },
  },
];

export async function dispatchTool(
  name: string,
  input: any,
  client: BasecampClient,
): Promise<unknown> {
  switch (name) {
    case 'list_projects':
      return client.listProjects(input?.status ?? 'active');
    case 'get_project':
      return client.getProject(input.project_id);
    case 'create_project':
      return client.createProject(input.name, input.description);
    case 'list_people_in_account':
      return client.listPeopleInAccount();
    case 'list_people_in_project':
      return client.listPeopleInProject(input.project_id);
    case 'grant_people_to_project':
      return client.grantPeopleToProject(input.project_id, input.person_ids);
    case 'revoke_people_from_project':
      return client.revokePeopleFromProject(input.project_id, input.person_ids);
    case 'list_todo_lists':
      return client.listTodoLists(input.project_id, input.todoset_id);
    case 'create_todo_list':
      return client.createTodoList(
        input.project_id,
        input.todoset_id,
        input.name,
        input.description,
      );
    case 'list_todos':
      return client.listTodos(input.project_id, input.todolist_id, input.status ?? 'active');
    case 'create_todo':
      return client.createTodo(input.project_id, input.todolist_id, input.content, {
        description: input.description,
        assignee_ids: input.assignee_ids,
        due_on: input.due_on,
        notify: input.notify,
      });
    case 'complete_todo':
      return client.completeTodo(input.project_id, input.todo_id);
    case 'reopen_todo':
      return client.reopenTodo(input.project_id, input.todo_id);
    case 'update_todo':
      return client.updateTodo(input.project_id, input.todo_id, input.patch);
    case 'list_messages':
      return client.listMessages(input.project_id, input.board_id);
    case 'post_message':
      return client.postMessage(
        input.project_id,
        input.board_id,
        input.subject,
        input.content,
        input.status ?? 'active',
      );
    case 'list_comments':
      return client.listComments(input.project_id, input.recording_id);
    case 'post_comment':
      return client.postComment(input.project_id, input.recording_id, input.content);
    case 'list_campfires':
      return client.listCampfires();
    case 'post_campfire_line':
      return client.postCampfireLine(input.project_id, input.campfire_id, input.content);
    case 'my_schedule':
      return client.mySchedule();
    case 'my_assignments':
      return client.myAssignments();
    case 'my_overdue':
      return client.myOverdue();
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
