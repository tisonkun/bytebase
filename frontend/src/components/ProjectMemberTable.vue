<template>
  <BBTable
    class="mt-2"
    :column-list="columnList"
    :section-data-source="dataSource"
    :compact-section="true"
    :show-header="true"
    :row-clickable="false"
  >
    <template #header>
      <BBTableHeaderCell
        :left-padding="4"
        class="w-auto table-cell"
        :title="columnList[0].title"
      />
      <template v-if="hasRBACFeature">
        <BBTableHeaderCell
          class="w-8 table-cell"
          :title="columnList[1].title"
        />
        <BBTableHeaderCell
          class="w-72 table-cell"
          :title="columnList[2].title"
        />
        <BBTableHeaderCell
          class="w-auto table-cell"
          :title="columnList[3].title"
        />
      </template>
      <template v-else>
        <BBTableHeaderCell
          class="w-72 table-cell"
          :title="columnList[1].title"
        />
        <BBTableHeaderCell
          class="w-auto table-cell"
          :title="columnList[2].title"
        />
      </template>
    </template>
    <template #body="{ rowData: member }">
      <BBTableCell :left-padding="4" class="table-cell">
        <div class="flex flex-row items-center space-x-2">
          <template v-if="'INVITED' == member.principal.status">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-main text-main-text"
              >{{ $t("settings.members.invited") }}</span
            >
            <span class="textlabel">{{ member.principal.email }}</span>
          </template>
          <template v-else>
            <PrincipalAvatar :principal="member.principal" />
            <div class="flex flex-col">
              <div class="flex flex-row items-center space-x-2">
                <router-link
                  :to="`/u/${member.principal.id}`"
                  class="normal-link"
                  >{{ member.principal.name }}</router-link
                >
                <span
                  v-if="currentUser.id == member.principal.id"
                  class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-green-100 text-green-800"
                  >{{ $t("common.you") }}</span
                >
              </div>
              <span class="textlabel">{{ member.principal.email }}</span>
            </div>
          </template>
        </div>
      </BBTableCell>
      <BBTableCell v-if="hasRBACFeature" class="whitespace-nowrap">
        <ProjectRoleSelect
          :selected-role="member.role"
          :disabled="!allowChangeRole(member.role)"
          @change-role="
            (role) => {
              changeRole(member.id, role);
            }
          "
        />
      </BBTableCell>
      <BBTableCell class="table-cell">
        <div class="flex flex-row items-center space-x-1">
          <span>{{ humanizeTs(member.updatedTs) }}</span>
          <span>{{ $t("common.by") }}</span>
          <router-link :to="`/u/${member.updater.id}`" class="normal-link">{{
            member.updater.name
          }}</router-link>
        </div>
      </BBTableCell>
      <BBTableCell>
        <BBButtonConfirm
          v-if="allowChangeRole(member.role)"
          :require-confirm="true"
          :ok-text="'Revoke'"
          :confirm-title="`Are you sure to revoke '${member.role}' from '${member.principal.name}'`"
          @confirm="deleteRole(member)"
        />
      </BBTableCell>
    </template>
  </BBTable>
</template>

<script lang="ts">
import { computed, PropType, reactive } from "vue";
import { useStore } from "vuex";
import ProjectRoleSelect from "../components/ProjectRoleSelect.vue";
import PrincipalAvatar from "../components/PrincipalAvatar.vue";
import {
  Project,
  ProjectMember,
  ProjectRoleType,
  MemberId,
  ProjectMemberPatch,
} from "../types";
import { BBTableColumn, BBTableSectionDataSource } from "../bbkit/types";
import { isOwner, isProjectOwner } from "../utils";
import { useI18n } from "vue-i18n";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LocalState {}

export default {
  name: "ProjectMemberTable",
  components: { ProjectRoleSelect, PrincipalAvatar },
  props: {
    project: {
      required: true,
      type: Object as PropType<Project>,
    },
  },
  setup(props) {
    const store = useStore();
    const { t } = useI18n();

    const currentUser = computed(() => store.getters["auth/currentUser"]());

    const hasRBACFeature = computed(() =>
      store.getters["subscription/feature"]("bb.feature.rbac")
    );

    const state = reactive<LocalState>({});

    const dataSource = computed(
      (): BBTableSectionDataSource<ProjectMember>[] => {
        const ownerList: ProjectMember[] = [];
        const developerList: ProjectMember[] = [];
        for (const member of props.project.memberList) {
          if (member.role == "OWNER") {
            ownerList.push(member);
          }

          if (member.role == "DEVELOPER") {
            developerList.push(member);
          }
        }

        const dataSource: BBTableSectionDataSource<ProjectMember>[] = [];
        if (hasRBACFeature.value) {
          dataSource.push({
            title: t("common.role.owner"),
            list: ownerList,
          });

          dataSource.push({
            title: t("common.role.developer"),
            list: developerList,
          });
        } else {
          ownerList.push(...developerList);

          dataSource.push({
            title: t("common.role.member"),
            list: ownerList,
          });
        }
        return dataSource;
      }
    );

    const columnList = computed((): BBTableColumn[] => {
      return hasRBACFeature.value
        ? [
            {
              title: t("settings.members.table.account"),
            },
            {
              title: t("settings.members.table.role"),
            },
            {
              title: t("settings.members.table.granted-time"),
            },
            {
              title: "",
            },
          ]
        : [
            {
              title: t("settings.members.table.account"),
            },
            {
              title: t("settings.members.table.granted-time"),
            },
            {
              title: "",
            },
          ];
    });

    // To prevent user accidentally removing roles and lock the project permanently, we take following measures:
    // 1. Disallow removing the last OWNER.
    // 2. Allow workspace OWNER to change roles. This helps when the project OWNER is no longer available and
    //    other project members can ask the workspace OWNER to assign new project OWNER.
    const allowChangeRole = (role: ProjectRoleType) => {
      if (props.project.rowStatus == "ARCHIVED") {
        return false;
      }

      if (role == "OWNER" && dataSource.value[0].list.length <= 1) {
        return false;
      }

      if (isOwner(currentUser.value.role)) {
        return true;
      }

      for (const member of props.project.memberList) {
        if (member.principal.id == currentUser.value.id) {
          if (isProjectOwner(member.role)) {
            return true;
          }
        }
      }

      return false;
    };

    const changeRole = (id: MemberId, role: ProjectRoleType) => {
      const projectMemberPatch: ProjectMemberPatch = {
        role,
      };
      store.dispatch("project/patchMember", {
        projectId: props.project.id,
        memberId: id,
        projectMemberPatch,
      });
    };

    const deleteRole = (member: ProjectMember) => {
      store.dispatch("project/deleteMember", member).then(() => {
        store.dispatch("notification/pushNotification", {
          module: "bytebase",
          style: "INFO",
          title: t("project.settings.success-menber-deleted-prompt", {
            name: member.principal.name,
          }),
        });
      });
    };

    return {
      state,
      currentUser,
      hasRBACFeature,
      columnList,
      dataSource,
      allowChangeRole,
      changeRole,
      deleteRole,
    };
  },
};
</script>
