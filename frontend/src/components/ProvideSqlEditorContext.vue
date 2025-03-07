<template>
  <slot />
</template>

<script lang="ts" setup>
import { computed, reactive, onMounted } from "vue";
import { useStore } from "vuex";
import {
  Instance,
  Database,
  Table,
  ConnectionAtom,
  ConnectionAtomType,
  UNKNOWN_ID,
  InstanceId,
  DatabaseId,
  Project,
} from "../types";

const store = useStore();
const state = reactive<{
  projectList: Project[];
  instanceIdList: Map<InstanceId, Instance["name"]>;
  databaseIdList: Map<DatabaseId, Database["name"]>;
}>({
  projectList: [],
  instanceIdList: new Map(),
  databaseIdList: new Map(),
});

const currentUser = computed(() => store.getters["auth/currentUser"]());

const prepareAccessibleConnectionByProject = async () => {
  // It will also be called when user logout
  if (currentUser.value.id != UNKNOWN_ID) {
    state.projectList = await store.dispatch("project/fetchProjectListByUser", {
      userId: currentUser.value.id,
    });
  }

  const promises = state.projectList.map(async (project) => {
    const databaseList = await store.dispatch(
      "database/fetchDatabaseListByProjectId",
      project.id
    );
    if (databaseList.length >= 0) {
      databaseList.forEach((database: Database) => {
        state.databaseIdList.set(database.id, database.name);
        state.instanceIdList.set(database.instance.id, database.instance.name);
      });
    }
  });

  await Promise.all(promises);
};

const prepareSqlEdtiorContext = async () => {
  store.dispatch("sqlEditor/setConnectionContext", { isLoadingTree: true });
  let connectionTree = [];

  const mapConnectionAtom =
    (type: ConnectionAtomType, parentId: number) =>
    (item: Instance | Database | Table) => {
      const connectionAtom: ConnectionAtom = {
        parentId,
        id: item.id,
        key: `${type}-${item.id}`,
        label: item.name,
        type,
      };

      return connectionAtom;
    };

  const instanceList = await store.dispatch("instance/fetchInstanceList");
  const filteredInstanceList = instanceList.filter((instance: Instance) =>
    state.instanceIdList.has(instance.id)
  );
  connectionTree = filteredInstanceList.map(mapConnectionAtom("instance", 0));

  for (const instance of filteredInstanceList) {
    const databaseList = await store.dispatch(
      "database/fetchDatabaseListByInstanceId",
      instance.id
    );

    const instanceItem = connectionTree.find(
      (item: ConnectionAtom) => item.id === instance.id
    );
    const filteredDatabaseList = databaseList.filter((database: Database) =>
      state.databaseIdList.has(database.id)
    );

    instanceItem.children = filteredDatabaseList.map(
      mapConnectionAtom("database", instance.id)
    );

    for (const db of filteredDatabaseList) {
      const tableList = await store.dispatch(
        "table/fetchTableListByDatabaseId",
        db.id
      );

      const databaseItem = instanceItem.children.find(
        (item: ConnectionAtom) => item.id === db.id
      );

      databaseItem.children = tableList.map(mapConnectionAtom("table", db.id));
    }
  }

  store.dispatch("sqlEditor/setConnectionTree", connectionTree);
  store.dispatch("sqlEditor/setConnectionContext", { isLoadingTree: false });
  store.dispatch("sqlEditor/fetchQueryHistoryList");
  store.dispatch("sqlEditor/setSqlEditorState", { isFetchingSheet: true });
  store.dispatch("sheet/fetchSheetList");
  store.dispatch("sqlEditor/setSqlEditorState", { isFetchingSheet: false });
};

onMounted(async () => {
  await prepareAccessibleConnectionByProject();
  await prepareSqlEdtiorContext();
});
</script>
