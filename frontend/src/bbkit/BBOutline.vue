<template>
  <div
    class="outline-title flex py-1"
    :class="dynamicItemClass()"
    @click.prevent="toggleCollapse"
    @mouseenter="state.hoverTitle = true"
    @mouseleave="state.hoverTitle = false"
  >
    <span :class="'pl-' + 2 * (level + 1)">{{ title }}</span>
    <template v-if="allowCollapse && state.hoverTitle">
      <svg
        v-if="collapseState"
        class="mr-2 h-4 w-4 transform group-hover:text-gray-400 group-focus:text-gray-400 transition-colors ease-in-out duration-150"
        viewBox="0 0 20 20"
      >
        <path d="M6 6L14 10L6 14V6Z" fill="currentColor" />
      </svg>
      <svg
        v-else
        class="mr-2 h-4 w-4 transform rotate-90 group-hover:text-gray-400 group-focus:text-gray-400 transition-colors ease-in-out duration-150"
        viewBox="0 0 20 20"
      >
        <path d="M6 6L14 10L6 14V6Z" fill="currentColor" />
      </svg>
    </template>
  </div>
  <div v-if="!allowCollapse || !collapseState">
    <div
      v-for="(item, index) in itemList"
      :key="index"
      role="group"
      @mouseenter="state.hoverIndex = index"
      @mouseleave="state.hoverIndex = -1"
    >
      <BBOutline
        v-if="item.childList"
        :id="[id, item.id].join('.')"
        :title="item.name"
        :item-list="item.childList"
        :allow-collapse="item.childCollapse"
        :level="level + 1"
      />
      <router-link
        v-else-if="item.link"
        :to="item.link"
        class="outline-item flex justify-between pr-1 py-1"
        :class="'pl-' + (4 + level * 3)"
      >
        <span class="truncate">{{ item.name }}</span>
        <button
          v-if="allowDelete && index == state.hoverIndex"
          class="focus:outline-none"
          @click.prevent="$emit('delete-index', index)"
        >
          <heroicons-solid:x class="w-4 h-4 hover:text-control-hover" />
        </button>
      </router-link>
      <span v-else class="pl-1 py-1 truncate">{{ item.name }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  computed,
  reactive,
  defineProps,
  defineEmits,
  withDefaults,
} from "vue";
import { useStore } from "vuex";
import { BBOutlineItem } from "./types";

interface LocalState {
  hoverIndex: number;
  hoverTitle: boolean;
  collapseState: boolean;
}

const props = withDefaults(
  defineProps<{
    // Used for storing the collapse state.
    // Empty id means not to store collapse state.
    id?: string;
    title: string;
    itemList: BBOutlineItem[];
    allowDelete?: boolean;
    allowCollapse?: boolean;
    level?: number;
  }>(),
  {
    id: "",
    allowDelete: false,
    allowCollapse: false,
    level: 0,
  }
);

defineEmits<{
  (event: "delete-index", index: number): void;
}>();

const store = useStore();

const state = reactive<LocalState>({
  hoverIndex: -1,
  hoverTitle: false,
  collapseState: true,
});

const collapseState = computed(() => {
  if (props.id) {
    return store.getters["uistate/collapseStateByKey"](props.id);
  }
  return state.collapseState;
});

const toggleCollapse = () => {
  if (props.allowCollapse) {
    if (props.id) {
      const newState = !collapseState.value;
      store.dispatch("uistate/savecollapseStateByKey", {
        key: props.id,
        collapse: newState,
      });
    } else {
      state.collapseState = !state.collapseState;
    }
  }
};

const dynamicItemClass = () => {
  let list = [];
  if (props.level == 0) {
    list.push("toplevel");
  }
  if (props.allowCollapse) {
    list.push("collapsible");
  }
  return list.join(" ");
};
</script>
