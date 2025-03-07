<template>
  <div class="relative h-screen overflow-hidden flex flex-col">
    <template v-if="isDemo">
      <BannerDemo />
    </template>
    <template v-else-if="isReadonly">
      <div
        class="h-12 w-full text-lg font-medium bg-yellow-500 text-white flex justify-center items-center"
      >
        Server is in readonly mode. You can still view the console, but any
        change attempt will fail.
      </div>
    </template>
    <nav class="bg-white border-b border-block-border">
      <div class="max-w-full mx-auto px-4">
        <DashboardHeader />
      </div>
    </nav>
    <!-- Suspense is experimental, be aware of the potential change -->
    <Suspense>
      <template #default>
        <ProvideDashboardContext>
          <router-view name="body" />
        </ProvideDashboardContext>
      </template>
      <template #fallback>
        <div class="flex flex-row justify-between p-4 space-x-2">
          <span class="items-center flex">Loading...</span>
          <button
            class="items-center flex justify-center btn-normal"
            @click.prevent="ping"
          >
            Ping
          </button>
        </div>
      </template>
    </Suspense>
  </div>
</template>

<script lang="ts">
import { useStore } from "vuex";
import ProvideDashboardContext from "../components/ProvideDashboardContext.vue";
import DashboardHeader from "../views/DashboardHeader.vue";
import BannerDemo from "../views/BannerDemo.vue";
import { ServerInfo } from "../types";
import { computed } from "vue";

export default {
  name: "DashboardLayout",
  components: { ProvideDashboardContext, DashboardHeader, BannerDemo },
  setup() {
    const store = useStore();

    const ping = () => {
      store.dispatch("actuator/fetchInfo").then((info: ServerInfo) => {
        store.dispatch("notification/pushNotification", {
          module: "bytebase",
          style: "SUCCESS",
          title: info,
        });
      });
    };

    const isDemo = computed(() => store.getters["actuator/isDemo"]());

    const isReadonly = computed(() => store.getters["actuator/isReadonly"]());

    return {
      ping,
      isDemo,
      isReadonly,
    };
  },
};
</script>
