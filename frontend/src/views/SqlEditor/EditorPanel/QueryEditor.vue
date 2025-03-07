<template>
  <MonacoEditor
    v-model:value="sqlCode"
    @change="handleChange"
    @change-selection="handleChangeSelection"
    @run-query="handleRunQuery"
    @save="handleSave"
  />
</template>

<script lang="ts" setup>
import { debounce } from "lodash-es";
import { computed } from "vue";
import {
  useNamespacedActions,
  useNamespacedGetters,
} from "vuex-composition-helpers";

import { useExecuteSQL } from "../../../composables/useExecuteSQL";
import { TabActions, TabGetters, SheetActions } from "../../../types";

const { currentTab } = useNamespacedGetters<TabGetters>("tab", ["currentTab"]);
const { updateCurrentTab } = useNamespacedActions<TabActions>("tab", [
  "updateCurrentTab",
]);
const { upsertSheet } = useNamespacedActions<SheetActions>("sheet", [
  "upsertSheet",
]);

const { execute } = useExecuteSQL();

const sqlCode = computed(() => currentTab.value.statement);

const handleChange = debounce((value: string) => {
  updateCurrentTab({
    statement: value,
    isSaved: false,
  });
}, 300);

const handleChangeSelection = debounce((value: string) => {
  updateCurrentTab({
    selectedStatement: value,
  });
}, 300);

const handleSave = async (statement: string) => {
  const { name, sheetId } = currentTab.value;

  const newSheet = await upsertSheet({
    id: sheetId,
    name,
    statement,
  });

  updateCurrentTab({
    sheetId: newSheet.id,
    isSaved: true,
  });
};

const handleRunQuery = () => {
  execute();
};
</script>
