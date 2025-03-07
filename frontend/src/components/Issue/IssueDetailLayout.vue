<template>
  <div
    id="issue-detail-top"
    class="flex-1 overflow-auto focus:outline-none"
    tabindex="0"
  >
    <IssueBanner v-if="!create" :issue="issue" />

    <!-- Highlight Panel -->
    <div class="bg-white px-4 pb-4">
      <IssueHighlightPanel
        :issue="issue"
        :create="create"
        :allow-edit="allowEditNameAndDescription"
        @update-name="updateName"
      >
        <IssueStatusTransitionButtonGroup
          :create="create"
          :allow-rollback="allowRollback"
          :issue="issue"
          :issue-template="issueTemplate"
          @create="doCreate"
          @rollback="doRollback"
          @change-issue-status="changeIssueStatus"
          @change-task-status="changeTaskStatus"
        />
      </IssueHighlightPanel>
    </div>

    <!-- Remind banner for bb.feature.backward-compatibility -->
    <FeatureAttention
      v-if="
        !hasBackwardCompatibilityFeature && supportBackwardCompatibilityFeature
      "
      custom-class="m-5 mt-0"
      feature="bb.feature.backward-compatibility"
      :description="
        $t('subscription.features.bb-feature-backward-compatibility.desc')
      "
    />

    <!-- Stage Flow Bar -->
    <template v-if="showPipelineFlowBar">
      <template v-if="isTenantDeployMode">
        <PipelineTenantFlow
          v-if="project"
          :create="create"
          :project="project"
          :pipeline="issue.pipeline"
          :selected-stage="selectedStage"
          :selected-task="selectedTask"
          class="border-t border-b"
          @select-stage-id="selectStageId"
          @select-task="selectTask"
        />
      </template>
      <template v-else>
        <PipelineSimpleFlow
          :create="create"
          :pipeline="issue.pipeline"
          :selected-stage="selectedStage"
          @select-stage-id="selectStageId"
        />
      </template>
      <div v-if="!create" class="px-4 py-4 md:flex md:flex-col border-b">
        <IssueStagePanel
          :stage="selectedStage"
          :selected-task="selectedTask"
          :single-mode="isTenantDeployMode"
        />
      </div>
    </template>

    <!-- Output Panel -->
    <!-- Only render the top border if PipelineFlowBar is not displayed, otherwise it would overlap with the bottom border of that -->
    <div
      v-if="showIssueOutputPanel"
      class="px-2 py-4 md:flex md:flex-col"
      :class="showPipelineFlowBar ? '' : 'lg:border-t'"
    >
      <IssueOutputPanel
        :issue="issue"
        :output-field-list="issueTemplate.outputFieldList"
        :allow-edit="allowEditOutput"
        @update-custom-field="updateCustomField"
      />
    </div>

    <!-- Main Content -->
    <main
      class="flex-1 relative overflow-y-auto focus:outline-none"
      :class="
        showPipelineFlowBar && !showIssueOutputPanel
          ? ''
          : 'lg:border-t lg:border-block-border'
      "
      tabindex="-1"
    >
      <div class="flex max-w-3xl mx-auto px-6 lg:max-w-full">
        <div class="flex flex-col flex-1 lg:flex-row-reverse lg:col-span-2">
          <div
            class="py-6 lg:pl-4 lg:w-96 xl:w-112 lg:border-l lg:border-block-border"
          >
            <IssueSidebar
              :issue="issue"
              :database="database"
              :instance="instance"
              :create="create"
              :selected-stage="selectedStage"
              :task="selectedTask"
              :input-field-list="issueTemplate.inputFieldList"
              :allow-edit="allowEditSidebar"
              @update-assignee-id="updateAssigneeId"
              @update-earliest-allowed-time="updateEarliestAllowedTime"
              @add-subscriber-id="addSubscriberId"
              @remove-subscriber-id="removeSubscriberId"
              @update-custom-field="updateCustomField"
              @select-stage-id="selectStageId"
              @select-task-id="selectTaskId"
            />
          </div>
          <div class="lg:hidden border-t border-block-border" />
          <div class="w-full py-4 pr-4">
            <section v-if="showIssueTaskStatementPanel" class="border-b mb-4">
              <div v-if="!create" class="mb-4">
                <TaskCheckBar
                  :task="selectedTask"
                  @run-checks="runTaskChecks"
                />
              </div>
              <template v-if="isTenantDeployMode">
                <!--
                  For tenant deploy mode, we provide only one statement panel.
                  It's editable only when creating an issue.
                  It will never show Rollback SQL.
                  It is not allowed to "Apply to other stages".
                -->
                <IssueTaskStatementPanel
                  :sql-hint="sqlHint(false)"
                  :statement="selectedStatement"
                  :create="create"
                  :allow-edit="create"
                  :rollback="false"
                  :show-apply-statement="false"
                  @update-statement="updateStatement"
                />
              </template>
              <template v-else>
                <!-- The way this is written is awkward and is to workaround an issue in IssueTaskStatementPanel.
                   The statement panel is in non-edit mode when not creating the issue, and we use v-highlight
                   to apply syntax highlighting when the panel is in non-edit mode. However, the v-highlight
                   doesn't seem to work well with the reactivity. So for non-edit mode when !props.create, we
                list every IssueTaskStatementPanel for each stage and use v-if to show the active one.-->
                <template v-if="create">
                  <IssueTaskStatementPanel
                    :sql-hint="sqlHint(false)"
                    :statement="selectedStatement"
                    :create="create"
                    :allow-edit="true"
                    :rollback="false"
                    :show-apply-statement="showIssueTaskStatementApply"
                    @update-statement="updateStatement"
                    @apply-statement-to-other-stages="
                      applyStatementToOtherStages
                    "
                  />
                </template>
                <template
                  v-for="(stage, index) in issue.pipeline.stageList"
                  v-else
                  :key="index"
                >
                  <template v-if="selectedStage.id == stage.id">
                    <IssueTaskStatementPanel
                      :sql-hint="sqlHint(false)"
                      :statement="statement(stage)"
                      :create="create"
                      :allow-edit="allowEditStatement"
                      :rollback="false"
                      :show-apply-statement="showIssueTaskStatementApply"
                      @update-statement="updateStatement"
                    />
                  </template>
                </template>
              </template>
            </section>
            <section
              v-if="showIssueTaskRollbackStatementPanel"
              class="border-b mb-4"
            >
              <template v-if="create">
                <IssueTaskStatementPanel
                  :sql-hint="sqlHint(true)"
                  :statement="selectedRollbackStatement"
                  :create="create"
                  :allow-edit="false"
                  :rollback="true"
                  :show-apply-statement="showIssueTaskStatementApply"
                  @update-statement="updateRollbackStatement"
                  @apply-statement-to-other-stages="
                    applyRollbackStatementToOtherStages
                  "
                />
              </template>
              <template
                v-for="(stage, index) in issue.pipeline.stageList"
                v-else
                :key="index"
              >
                <template v-if="selectedStage.id == stage.id">
                  <IssueTaskStatementPanel
                    :sql-hint="sqlHint(true)"
                    :statement="rollbackStatement(stage)"
                    :create="create"
                    :allow-edit="false"
                    :rollback="true"
                    :show-apply-statement="showIssueTaskStatementApply"
                    @update-statement="updateRollbackStatement"
                  />
                </template>
              </template>
            </section>
            <IssueDescriptionPanel
              :issue="issue"
              :create="create"
              :allow-edit="allowEditNameAndDescription"
              @update-description="updateDescription"
            />
            <section
              v-if="!create"
              aria-labelledby="activity-title"
              class="mt-4"
            >
              <IssueActivityPanel
                :issue="issue"
                :issue-template="issueTemplate"
                @add-subscriber-id="addSubscriberId"
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
/* eslint-disable vue/no-mutating-props */

import {
  computed,
  defineComponent,
  nextTick,
  onMounted,
  PropType,
  watchEffect,
} from "vue";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";
import { cloneDeep, isEqual } from "lodash-es";
import {
  idFromSlug,
  issueSlug,
  pipelineType,
  PipelineType,
  indexFromSlug,
  activeStage,
  stageSlug,
  activeTask,
  taskSlug,
} from "../../utils";
import IssueBanner from "./IssueBanner.vue";
import IssueHighlightPanel from "./IssueHighlightPanel.vue";
import IssueStagePanel from "./IssueStagePanel.vue";
import IssueStatusTransitionButtonGroup from "./IssueStatusTransitionButtonGroup.vue";
import IssueOutputPanel from "./IssueOutputPanel.vue";
import IssueSidebar from "./IssueSidebar.vue";
import IssueTaskStatementPanel from "./IssueTaskStatementPanel.vue";
import IssueDescriptionPanel from "./IssueDescriptionPanel.vue";
import IssueActivityPanel from "./IssueActivityPanel.vue";
import PipelineSimpleFlow from "./PipelineSimpleFlow.vue";
import PipelineTenantFlow from "./PipelineTenantFlow.vue";
import TaskCheckBar from "./TaskCheckBar.vue";
import {
  Issue,
  IssueCreate,
  IssuePatch,
  PrincipalId,
  Database,
  Instance,
  Stage,
  StageId,
  IssueStatus,
  TaskId,
  TaskStatusPatch,
  TaskStatus,
  IssueStatusPatch,
  Task,
  TaskDatabaseSchemaUpdatePayload,
  TaskDatabaseDataUpdatePayload,
  StageCreate,
  TaskCreate,
  TaskDatabaseCreatePayload,
  TaskGeneralPayload,
  Project,
  MigrationType,
  TaskPatch,
  UpdateSchemaContext,
} from "../../types";
import {
  defaulTemplate as defaultTemplate,
  templateForType,
  InputField,
  OutputField,
} from "../../plugins";
import { isEmpty } from "lodash-es";

export default defineComponent({
  name: "IssueDetailLayout",
  components: {
    IssueBanner,
    IssueHighlightPanel,
    IssueStagePanel,
    IssueOutputPanel,
    IssueTaskStatementPanel,
    IssueDescriptionPanel,
    IssueActivityPanel,
    IssueSidebar,
    IssueStatusTransitionButtonGroup,
    PipelineSimpleFlow,
    PipelineTenantFlow,
    TaskCheckBar,
  },
  props: {
    create: {
      type: Boolean,
      required: true,
    },
    issue: {
      type: Object as PropType<Issue | IssueCreate>,
      required: true,
    },
  },
  emits: {
    "status-changed": (eager: boolean) => true,
  },
  setup(props, { emit }) {
    const store = useStore();
    const router = useRouter();
    const route = useRoute();

    const currentUser = computed(() => store.getters["auth/currentUser"]());

    watchEffect(function prepare() {
      if (props.create) {
        store.dispatch(
          "project/fetchProjectById",
          (props.issue as IssueCreate).projectId
        );
      }
    });

    const issueTemplate = computed(
      () => templateForType(props.issue.type) || defaultTemplate()
    );

    const project = computed((): Project => {
      if (props.create) {
        return store.getters["project/projectById"](
          (props.issue as IssueCreate).projectId
        );
      }
      return (props.issue as Issue).project;
    });

    const updateName = (
      newName: string,
      postUpdated: (updatedIssue: Issue) => void
    ) => {
      if (props.create) {
        props.issue.name = newName;
      } else {
        patchIssue(
          {
            name: newName,
          },
          postUpdated
        );
      }
    };

    const updateStatement = (
      newStatement: string,
      postUpdated?: (updatedTask: Task) => void
    ) => {
      if (props.create) {
        if (isTenantDeployMode.value) {
          // For tenant deploy mode, we apply the statement to all stages and all tasks
          const issueCreate = props.issue as IssueCreate;
          const context = issueCreate.createContext as UpdateSchemaContext;
          issueCreate.pipeline?.stageList.forEach((stage: StageCreate) => {
            stage.taskList.forEach((task) => {
              task.statement = newStatement;
            });
          });
          // We also apply it to the CreateContext
          context.updateSchemaDetailList.forEach(
            (detail) => (detail.statement = newStatement)
          );
        } else {
          // otherwise apply it to the only one task in stage
          // i.e. selectedStage.taskList[0]
          const stage = selectedStage.value as StageCreate;
          stage.taskList[0].statement = newStatement;
        }
      } else {
        if (isTenantDeployMode.value) {
          // <del>For tenant deploy mode, we patch the issue's create context</del>
          // nope, we are not allowed to update statement in tenant deploy mode anyway
        } else {
          // otherwise, patch the task
          patchTask(
            (selectedTask.value as Task).id,
            {
              statement: newStatement,
            },
            postUpdated
          );
        }
      }
    };

    const applyStatementToOtherStages = (newStatement: string) => {
      for (const stage of (props.issue as IssueCreate).pipeline!.stageList) {
        for (const task of stage.taskList) {
          if (
            task.type == "bb.task.general" ||
            task.type == "bb.task.database.create" ||
            task.type == "bb.task.database.schema.update" ||
            task.type == "bb.task.database.data.update"
          ) {
            task.statement = newStatement;
          }
        }
      }
    };

    const updateRollbackStatement = (newStatement: string) => {
      const stage = selectedStage.value as StageCreate;
      stage.taskList[0].rollbackStatement = newStatement;
    };

    const applyRollbackStatementToOtherStages = (newStatement: string) => {
      for (const stage of (props.issue as IssueCreate).pipeline!.stageList) {
        for (const task of stage.taskList) {
          if (
            task.type == "bb.task.database.schema.update" ||
            task.type == "bb.task.database.data.update"
          ) {
            task.rollbackStatement = newStatement;
          }
        }
      }
    };

    const updateDescription = (
      newDescription: string,
      postUpdated: (updatedIssue: Issue) => void
    ) => {
      if (props.create) {
        props.issue.description = newDescription;
      } else {
        patchIssue(
          {
            description: newDescription,
          },
          postUpdated
        );
      }
    };

    const updateAssigneeId = (newAssigneeId: PrincipalId) => {
      if (props.create) {
        (props.issue as IssueCreate).assigneeId = newAssigneeId;
      } else {
        patchIssue({
          assigneeId: newAssigneeId,
        });
      }
    };

    const updateEarliestAllowedTime = (newEarliestAllowedTsMs: number) => {
      if (props.create) {
        selectedTask.value.earliestAllowedTs = newEarliestAllowedTsMs;
      } else {
        const taskPatch: TaskPatch = {
          earliestAllowedTs: newEarliestAllowedTsMs,
        };
        patchTask((selectedTask.value as Task).id, taskPatch);
      }
    };

    const addSubscriberId = (subscriberId: PrincipalId) => {
      store.dispatch("issueSubscriber/createSubscriber", {
        issueId: (props.issue as Issue).id,
        subscriberId,
      });
    };

    const removeSubscriberId = (subscriberId: PrincipalId) => {
      store.dispatch("issueSubscriber/deleteSubscriber", {
        issueId: (props.issue as Issue).id,
        subscriberId,
      });
    };

    const updateCustomField = (field: InputField | OutputField, value: any) => {
      if (!isEqual(props.issue.payload[field.id], value)) {
        if (props.create) {
          props.issue.payload[field.id] = value;
        } else {
          const newPayload = cloneDeep(props.issue.payload);
          newPayload[field.id] = value;
          patchIssue({
            payload: newPayload,
          });
        }
      }
    };

    const doCreate = () => {
      const issue = cloneDeep(props.issue) as IssueCreate;
      if (isTenantDeployMode.value) {
        // multi-tenancy issue's pipeline is generated on server-side
        // so empty the local pipeline
        delete issue.pipeline;
        issue.payload = {};
      }
      store.dispatch("issue/createIssue", issue).then((createdIssue) => {
        // Use replace to omit the new issue url in the navigation history.
        router.replace(
          `/issue/${issueSlug(createdIssue.name, createdIssue.id)}`
        );
      });
    };

    const doRollback = () => {
      router.push({
        name: "workspace.issue.detail",
        params: {
          issueSlug: "new",
        },
        query: {
          template: props.issue.type,
          rollbackIssue: (props.issue as Issue).id,
        },
      });
    };

    const changeIssueStatus = (newStatus: IssueStatus, comment: string) => {
      const issueStatusPatch: IssueStatusPatch = {
        status: newStatus,
        comment: comment,
      };

      store
        .dispatch("issue/updateIssueStatus", {
          issueId: (props.issue as Issue).id,
          issueStatusPatch,
        })
        .then(() => {
          // pollIssue(POST_CHANGE_POLL_INTERVAL);
        });
    };

    const changeTaskStatus = (
      task: Task,
      newStatus: TaskStatus,
      comment: string
    ) => {
      // Switch to the stage view containing this task
      selectStageId(task.stage.id);
      nextTick().then(() => {
        selectTaskId(task.id);
      });

      const taskStatusPatch: TaskStatusPatch = {
        status: newStatus,
        comment: comment,
      };

      store
        .dispatch("task/updateStatus", {
          issueId: (props.issue as Issue).id,
          pipelineId: (props.issue as Issue).pipeline.id,
          taskId: task.id,
          taskStatusPatch,
        })
        .then(() => {
          // pollIssue(POST_CHANGE_POLL_INTERVAL);
          emit("status-changed", true);
        });
    };

    const runTaskChecks = (task: Task) => {
      store
        .dispatch("task/runChecks", {
          issueId: (props.issue as Issue).id,
          pipelineId: (props.issue as Issue).pipeline.id,
          taskId: task.id,
        })
        .then(() => {
          // pollIssue(POST_CHANGE_POLL_INTERVAL);
          emit("status-changed", true);
        });
    };

    const patchIssue = (
      issuePatch: IssuePatch,
      postUpdated?: (updatedIssue: Issue) => void
    ) => {
      store
        .dispatch("issue/patchIssue", {
          issueId: (props.issue as Issue).id,
          issuePatch,
        })
        .then((updatedIssue) => {
          // issue/patchIssue already fetches the new issue, so we schedule
          // the next poll in NORMAL_POLL_INTERVAL
          // pollIssue(NORMAL_POLL_INTERVAL);
          emit("status-changed", false);
          if (postUpdated) {
            postUpdated(updatedIssue);
          }
        });
    };

    const patchTask = (
      taskId: TaskId,
      taskPatch: TaskPatch,
      postUpdated?: (updatedTask: Task) => void
    ) => {
      store
        .dispatch("task/patchTask", {
          issueId: (props.issue as Issue).id,
          pipelineId: (props.issue as Issue).pipeline.id,
          taskId,
          taskPatch,
        })
        .then((updatedTask) => {
          // For now, the only task/patchTask is to change statement, which will trigger async task check.
          // Thus we use the short poll interval
          // pollIssue(POST_CHANGE_POLL_INTERVAL);
          emit("status-changed", true);
          if (postUpdated) {
            postUpdated(updatedTask);
          }
        });
    };

    const currentPipelineType = computed((): PipelineType => {
      return pipelineType(props.issue.pipeline!);
    });

    const selectedStage = computed((): Stage | StageCreate => {
      const stageSlug = router.currentRoute.value.query.stage as string;
      const taskSlug = router.currentRoute.value.query.task as string;
      // For stage slug, we support both index based and id based.
      // Index based is used when creating the new task and is the one used when clicking the UI.
      // Id based is used when the context only has access to the stage id (e.g. Task only contains StageId)
      if (stageSlug) {
        const index = indexFromSlug(stageSlug);
        if (index < props.issue.pipeline!.stageList.length) {
          return props.issue.pipeline!.stageList[index];
        }
        const stageId = idFromSlug(stageSlug);
        const stageList = (props.issue as Issue).pipeline.stageList;
        for (const stage of stageList) {
          if (stage.id == stageId) {
            return stage;
          }
        }
      } else if (!props.create && taskSlug) {
        const taskId = idFromSlug(taskSlug);
        const stageList = (props.issue as Issue).pipeline.stageList;
        for (const stage of stageList) {
          for (const task of stage.taskList) {
            if (task.id == taskId) {
              return stage;
            }
          }
        }
      }
      if (props.create) {
        return props.issue.pipeline!.stageList[0];
      }
      return activeStage((props.issue as Issue).pipeline);
    });

    const selectStageId = (
      stageId: StageId,
      task: string | undefined = undefined
    ) => {
      const stageList = props.issue.pipeline!.stageList;
      const index = stageList.findIndex((item, index) => {
        if (props.create) {
          return index == stageId;
        }
        return (item as Stage).id == stageId;
      });
      router.replace({
        name: "workspace.issue.detail",
        query: {
          ...router.currentRoute.value.query,
          stage: stageSlug(stageList[index].name, index),
          task,
        },
      });
    };

    const selectTask = (stageId: StageId, taskSlug: string) => {
      selectStageId(stageId, taskSlug);
    };

    const selectTaskId = (taskId: TaskId) => {
      const taskList = selectedStage.value.taskList as Task[];
      const task = taskList.find((t) => t.id === taskId);
      if (!task) return;
      const slug = taskSlug(task.name, task.id);
      const stage = selectedStage.value as Stage;
      selectTask(stage.id, slug);
    };

    const selectedTask = computed((): Task | TaskCreate => {
      const taskSlug = route.query.task as string;
      const { taskList } = selectedStage.value;
      if (taskSlug) {
        const index = indexFromSlug(taskSlug);
        if (index < taskList.length) {
          return taskList[index];
        }
        const id = idFromSlug(taskSlug);
        for (let i = 0; i < taskList.length; i++) {
          const task = taskList[i] as Task;
          if (task.id === id) {
            return task;
          }
        }
      }
      return taskList[0];
    });

    const statement = (stage: Stage): string => {
      const task = stage.taskList[0];
      switch (task.type) {
        case "bb.task.general":
          return ((task as Task).payload as TaskGeneralPayload).statement || "";
        case "bb.task.database.create":
          return (
            ((task as Task).payload as TaskDatabaseCreatePayload).statement ||
            ""
          );
        case "bb.task.database.schema.update":
          return (
            ((task as Task).payload as TaskDatabaseSchemaUpdatePayload)
              .statement || ""
          );
        case "bb.task.database.data.update":
          return (
            ((task as Task).payload as TaskDatabaseDataUpdatePayload)
              .statement || ""
          );
        case "bb.task.database.restore":
          return "";
      }
    };

    const rollbackStatement = (stage: Stage): string => {
      const task = stage.taskList[0];
      switch (task.type) {
        case "bb.task.database.schema.update":
          return (
            (task.payload as TaskDatabaseSchemaUpdatePayload)
              .rollbackStatement || ""
          );
        case "bb.task.database.data.update":
          return (
            (task.payload as TaskDatabaseDataUpdatePayload).rollbackStatement ||
            ""
          );
        default:
          return "";
      }
    };

    const isTenantDeployMode = computed((): boolean => {
      if (
        props.issue.type === "bb.issue.database.schema.update" &&
        project.value.tenantMode === "TENANT"
      ) {
        const stages = props.issue.pipeline?.stageList;
        // We need this check, because when we do a "Establish new baseline" to
        //   one of a tenant mode project's databases, we will create an issue
        //   with type "bb.issue.database.schema.update" with dummy SQL statement.
        // In this case, it's schema.update, and it's TENANT mode, but it's not
        //   a tenancy-based deployment
        // But we down-grade "1x1" pipeline to simple database deploy, that is
        //   when we click "Alter Schema" in database detail page to alter exactly
        //   ONE database's schema
        if (stages) {
          if (stages.length > 1) {
            // n stages, it's tenant mode
            // we won't down-grade to multi-database deployment here
            return true;
          }
          if (stages.length === 1 && stages[0].taskList.length > 1) {
            // 1 stage, n tasks, yes it's tenant mode
            return true;
          }
        }
      }
      return false;
    });

    const selectedStatement = computed((): string => {
      if (isTenantDeployMode.value) {
        if (props.create) {
          const issueCreate = props.issue as IssueCreate;
          const context = issueCreate.createContext as UpdateSchemaContext;
          return context.updateSchemaDetailList[0].statement;
        } else {
          const issue = props.issue as Issue;
          const task = issue.pipeline.stageList[0].taskList[0];
          const payload = task.payload as TaskDatabaseSchemaUpdatePayload;
          return payload.statement;
        }
      } else {
        if (router.currentRoute.value.query.sql) {
          const sql = router.currentRoute.value.query.sql as string;
          updateStatement(sql);
        }

        const task = (selectedStage.value as StageCreate).taskList[0];
        return task.statement;
      }
    });

    const selectedRollbackStatement = computed((): string => {
      const task = (selectedStage.value as StageCreate).taskList[0];
      return task.rollbackStatement;
    });

    const selectedMigrateType = computed((): MigrationType => {
      if (
        !props.create &&
        selectedTask.value.type == "bb.task.database.schema.update"
      ) {
        return (
          (selectedTask.value as Task)
            .payload as TaskDatabaseSchemaUpdatePayload
        ).migrationType;
      }
      return "MIGRATE";
    });

    const allowEditSidebar = computed(() => {
      // For now, we only allow assignee to update the field when the issue
      // is 'OPEN'. This reduces flexibility as creator must ask assignee to
      // change any fields if there is typo. On the other hand, this avoids
      // the trouble that the creator changes field value when the creator
      // is performing the issue based on the old value.
      // For now, we choose to be on the safe side at the cost of flexibility.
      return (
        props.create ||
        ((props.issue as Issue).status == "OPEN" &&
          (props.issue as Issue).assignee?.id == currentUser.value.id)
      );
    });

    const allowEditOutput = computed(() => {
      return (
        props.create ||
        ((props.issue as Issue).status == "OPEN" &&
          (props.issue as Issue).assignee?.id == currentUser.value.id)
      );
    });

    const allowEditNameAndDescription = computed(() => {
      return (
        props.create ||
        ((props.issue as Issue).status == "OPEN" &&
          ((props.issue as Issue).assignee?.id == currentUser.value.id ||
            (props.issue as Issue).creator.id == currentUser.value.id))
      );
    });

    const allowEditStatement = computed(() => {
      // if creating an issue, it's editable
      if (props.create) {
        return true;
      }
      const checkTask = (task: Task) => {
        return (
          task.status == "PENDING" ||
          task.status == "PENDING_APPROVAL" ||
          task.status == "FAILED"
        );
      };

      const issue = props.issue as Issue;
      // if not creating, we are allowed to edit sql statement only when:
      // 1. issue.status is OPEN
      // 2. AND currentUser is the creator
      // 3. AND workflowType is UI
      if (issue.status !== "OPEN") return false;
      if (issue.creator.id !== currentUser.value.id) return false;
      if (issue.project.workflowType !== "UI") return false;

      if (isTenantDeployMode.value) {
        // <del>then if in tenant deploy mode, EVERY task must be PENDING or PENDING_APPROVAL or FAILED</del>
        // nope, we are not allowed to update statement in tenant deploy mode anyway
        // const allTasks = issue.pipeline.stageList.flatMap(
        //   (stage) => stage.taskList
        // );
        // return allTasks.every((task) => checkTask(task));
        return false;
      } else {
        // otherwise, check `selectedTask`, expected to be PENDING or PENDING_APPROVAL or FAILED
        return checkTask(selectedTask.value as Task);
      }
    });

    // For now, we only support rollback for schema update issue when all below conditions met:
    // 0. NOT tenant deploy mode
    // 1. Issue is in DONE or CANCELED state
    // 2. There is at least one completed schema update task and the task contains the rollback statement.
    const allowRollback = computed(() => {
      if (isTenantDeployMode.value) {
        return false;
      }
      if (!props.create) {
        if (
          props.issue.type == "bb.issue.database.schema.update" ||
          props.issue.type == "bb.issue.database.data.update"
        ) {
          if (
            (props.issue as Issue).status == "DONE" ||
            (props.issue as Issue).status == "CANCELED"
          ) {
            for (const stage of (props.issue as Issue).pipeline.stageList) {
              for (const task of stage.taskList) {
                if (task.status == "DONE") {
                  if (
                    task.type == "bb.task.database.schema.update" &&
                    !isEmpty(
                      (task.payload as TaskDatabaseSchemaUpdatePayload)
                        .rollbackStatement
                    )
                  ) {
                    return true;
                  } else if (
                    task.type == "bb.task.database.data.update" &&
                    !isEmpty(
                      (task.payload as TaskDatabaseDataUpdatePayload)
                        .rollbackStatement
                    )
                  ) {
                    return true;
                  }
                }
              }
            }
          }
        }
      }
      return false;
    });

    const showCancelBanner = computed(() => {
      return !props.create && (props.issue as Issue).status == "CANCELED";
    });

    const showSuccessBanner = computed(() => {
      return !props.create && (props.issue as Issue).status == "DONE";
    });

    const showPendingApproval = computed(() => {
      if (props.create) {
        return false;
      }

      const task = activeTask((props.issue as Issue).pipeline);
      return task.status == "PENDING_APPROVAL";
    });

    const showPipelineFlowBar = computed(() => {
      return currentPipelineType.value != "NO_PIPELINE";
    });

    const showIssueOutputPanel = computed(() => {
      return !props.create && issueTemplate.value.outputFieldList.length > 0;
    });

    const showIssueTaskStatementPanel = computed(() => {
      const task = selectedTask.value;
      return (
        task.type == "bb.task.general" ||
        task.type == "bb.task.database.create" ||
        task.type == "bb.task.database.schema.update" ||
        task.type == "bb.task.database.data.update"
      );
    });

    const showIssueTaskRollbackStatementPanel = computed(() => {
      if (isTenantDeployMode.value) return false;
      if (project.value.workflowType == "UI") {
        if (
          props.issue.type == "bb.issue.database.schema.update" ||
          props.issue.type == "bb.issue.database.data.update"
        ) {
          return true;
        }
      }
      return false;
    });

    const showIssueTaskStatementApply = computed(() => {
      if (!props.create) {
        return false;
      }
      if (isTenantDeployMode.value) {
        return false;
      }
      let count = 0;
      for (const stage of (props.issue as IssueCreate).pipeline!.stageList) {
        for (const task of stage.taskList) {
          if (
            task.type == "bb.task.general" ||
            task.type == "bb.task.database.create" ||
            task.type == "bb.task.database.schema.update" ||
            task.type == "bb.task.database.data.update"
          ) {
            count++;
          }
        }
      }
      return count > 1;
    });

    const database = computed((): Database | undefined => {
      if (props.create) {
        const databaseId = (selectedTask.value as TaskCreate).databaseId;
        if (databaseId) {
          return store.getters["database/databaseById"](databaseId);
        }
        return undefined;
      }
      return (selectedTask.value as Task).database;
    });

    const instance = computed((): Instance => {
      if (props.create) {
        // If database is available, then we derive the instance from database because we always fetch database's instance.
        if (database.value) {
          return database.value.instance;
        }
        return store.getters["instance/instanceById"](
          (selectedTask.value as TaskCreate).instanceId
        );
      }
      return (selectedTask.value as Task).instance;
    });

    const sqlHint = (isRollBack: boolean): string | undefined => {
      if (
        !isRollBack &&
        !props.create &&
        selectedMigrateType.value == "BASELINE"
      ) {
        return `This is a baseline migration and bytebase won't apply the SQL to the database, it will only record a baseline history`;
      }
      if (!isRollBack && instance.value.engine === "SNOWFLAKE") {
        return `Use <<schema>>.<<table>> to specify a Snowflake table`;
      }
      return undefined;
    };

    onMounted(() => {
      // Always scroll to top, the scrollBehavior doesn't seem to work.
      // The hypothesis is that because the scroll bar is in the nested
      // route, thus setting the scrollBehavior in the global router
      // won't work.
      document.getElementById("issue-detail-top")!.scrollIntoView();
    });

    const hasBackwardCompatibilityFeature = computed((): boolean => {
      return store.getters["subscription/feature"](
        "bb.feature.backward-compatibility"
      );
    });

    const supportBackwardCompatibilityFeature = computed((): boolean => {
      const engine = database.value?.instance.engine;
      return engine === "MYSQL" || engine === "TIDB";
    });

    return {
      database,
      instance,
      sqlHint,
      updateName,
      updateDescription,
      updateStatement,
      updateEarliestAllowedTime,
      applyStatementToOtherStages,
      updateRollbackStatement,
      applyRollbackStatementToOtherStages,
      updateAssigneeId,
      addSubscriberId,
      removeSubscriberId,
      updateCustomField,
      doCreate,
      doRollback,
      changeIssueStatus,
      changeTaskStatus,
      runTaskChecks,
      currentPipelineType,
      currentUser,
      project,
      isTenantDeployMode,
      issueTemplate,
      selectedStage,
      selectedTask,
      selectStageId,
      selectTask,
      selectTaskId,
      statement,
      rollbackStatement,
      selectedStatement,
      selectedRollbackStatement,
      selectedMigrateType,
      allowEditSidebar,
      allowEditOutput,
      allowEditNameAndDescription,
      allowEditStatement,
      allowRollback,
      showCancelBanner,
      showSuccessBanner,
      showPendingApproval,
      showPipelineFlowBar,
      showIssueOutputPanel,
      showIssueTaskStatementPanel,
      showIssueTaskRollbackStatementPanel,
      showIssueTaskStatementApply,
      hasBackwardCompatibilityFeature,
      supportBackwardCompatibilityFeature,
    };
  },
});
</script>
