<template>
  <div class="mt-2 space-y-6 divide-y divide-block-border">
    <div class="mt-4">
      <BBTable
        class="mt-2"
        :column-list="COLUMN_LIST"
        :data-source="labelList"
        :show-header="true"
        :row-clickable="false"
      >
        <template #body="{ rowData: label }">
          <BBTableCell :left-padding="4" class="w-36 table-cell">
            <!-- will not capitalize label.key here due to it may be editable in the future -->
            <!-- capitalizing editable things may be confusing -->
            <!-- capitalizing only bb.prefixed things makes it inconsistent with others -->
            <!-- so just capitalize none of them -->
            {{ hidePrefix(label.key) }}
          </BBTableCell>
          <BBTableCell class="whitespace-nowrap">
            <div class="tags">
              <div v-for="(value, j) in label.valueList" :key="j" class="tag">
                <span>{{ value }}</span>
                <span
                  v-if="allowRemove"
                  class="remove"
                  @click="removeValue(label, value)"
                >
                  <heroicons-solid:x class="w-3 h-3" />
                </span>
              </div>
              <AddLabelValue
                v-if="allowEdit"
                :label="label"
                @add="(v) => addValue(label, v)"
              />
            </div>
          </BBTableCell>
        </template>
      </BBTable>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, watchEffect } from "vue";
import { useStore } from "vuex";
import { isDBAOrOwner, hidePrefix } from "../utils";
import { Principal, Label, LabelPatch } from "../types";
import { BBTableColumn } from "../bbkit/types";
import { BBTable, BBTableCell } from "../bbkit";
import { useI18n } from "vue-i18n";
import AddLabelValue from "../components/AddLabelValue.vue";

export default defineComponent({
  name: "SettingWorkspaceLabels",
  components: {
    BBTable,
    BBTableCell,
    AddLabelValue,
  },
  setup() {
    const { t } = useI18n();
    const store = useStore();
    const currentUser = computed(
      () => store.getters["auth/currentUser"]() as Principal
    );

    const prepareLabelList = () => {
      store.dispatch("label/fetchLabelList");
    };

    watchEffect(prepareLabelList);

    const labelList = computed(
      () => store.getters["label/labelList"]() as Label[]
    );

    const allowEdit = computed(() => {
      return isDBAOrOwner(currentUser.value.role);
    });

    const allowRemove = computed(() => {
      // no, we don't allow to remove values now
      return false;
      // return allowEdit.value;
    });

    const addValue = (label: Label, value: string) => {
      const labelPatch: LabelPatch = {
        valueList: [...label.valueList, value],
      };
      store.dispatch("label/patchLabel", {
        id: label.id,
        labelPatch,
      });
    };

    const removeValue = (label: Label, value: string) => {
      const valueList = [...label.valueList];
      const index = valueList.indexOf(value);
      if (index < 0) return;
      valueList.splice(index, 1);
      const labelPatch: LabelPatch = {
        valueList,
      };
      store.dispatch("label/patchLabel", {
        id: label.id,
        labelPatch,
      });
    };

    const COLUMN_LIST = computed((): BBTableColumn[] => [
      {
        title: t("setting.label.key"),
      },
      {
        title: t("setting.label.values"),
      },
    ]);

    return {
      COLUMN_LIST,
      labelList,
      hidePrefix,
      allowEdit,
      allowRemove,
      addValue,
      removeValue,
    };
  },
});
</script>

<style scoped lang="postcss">
.tags {
  @apply flex flex-wrap gap-2;
}
.tag {
  @apply h-6 bg-blue-100 border-blue-300 border px-2 rounded whitespace-nowrap inline-flex items-center;
}
.tag > .remove {
  @apply ml-1 -mr-1 p-px cursor-pointer hover:bg-blue-300 rounded-sm;
}
</style>
