<template>
  <div class="hidden md:block">
    <table id="plans" class="w-full h-px table-fixed">
      <caption class="sr-only">
        Pricing plan comparison
      </caption>
      <thead>
        <tr>
          <th
            class="py-8 px-6 text-sm font-medium text-gray-900 text-left align-top"
            scope="row"
          ></th>
          <td
            v-for="plan in plans"
            :key="plan.type"
            class="h-full pt-8 px-6 align-top"
          >
            <div class="flex-1">
              <img :src="plan.image" class="hidden lg:block p-5" />

              <div class="flex items-center h-10">
                <h3 class="text-xl font-semibold text-gray-900">
                  {{ $t(`subscription.plan.${plan.title}.title`) }}
                </h3>
                <span
                  v-if="plan.label"
                  class="ml-2 inline-flex items-center px-3 py-0.5 rounded-full text-base font-sm bg-indigo-100 text-indigo-800"
                >
                  {{ plan.label }}
                </span>
              </div>

              <p class="text-gray-500 mb-10 h-12">
                {{ $t(`subscription.plan.${plan.title}.desc`) }}
              </p>

              <p class="mt-4 flex items-baseline text-gray-900 text-xl">
                <span class="text-4xl">
                  ${{ plan.pricePerInstancePerMonth }}
                </span>
                {{ $t("subscription.per-month") }}
              </p>

              <div class="text-gray-400">
                {{ $t("subscription.per-instance") }}
              </div>
              <div class="text-gray-400">
                {{ $t(`subscription.${plan.title}-price-intro`) }}
              </div>

              <button
                type="button"
                :class="[
                  plan.highlight
                    ? 'border-indigo-500  text-white  bg-indigo-500 hover:bg-indigo-600 hover:border-indigo-600'
                    : 'border-accent text-accent hover:bg-accent',
                  'mt-8 block w-full border rounded-md py-2 lg:py-4 text-sm lg:text-xl font-semibold text-center hover:text-white whitespace-nowrap overflow-hidden',
                ]"
                @click="onButtonClick(plan)"
              >
                {{ plan.buttonText }}
              </button>
            </div>
          </td>
        </tr>
      </thead>
    </table>
    <div class="px-4 py-8 text-right text-gray-500">
      <i18n-t keypath="subscription.announcement">
        <template #cancel>
          <a
            class="underline"
            href="https://bytebase.com/refund"
            target="_blank"
            >{{ $t("subscription.cancel") }}</a
          >
        </template>
      </i18n-t>
    </div>
    <table class="w-full h-px table-fixed mb-16">
      <caption class="sr-only">
        Feature comparison
      </caption>
      <tbody class="border-t border-gray-200 divide-y divide-gray-200">
        <template v-for="section in sections" :key="section.id">
          <tr>
            <th
              class="bg-gray-50 py-3 pl-6 text-sm font-medium text-gray-900 text-left"
              colspan="4"
              scope="colgroup"
            >
              {{ $t(`subscription.feature-sections.${section.id}.title`) }}
            </th>
          </tr>
          <tr
            v-for="feature in section.features"
            :key="feature"
            class="hover:bg-gray-50"
          >
            <th
              class="py-5 px-6 text-sm font-normal text-gray-500 text-left"
              scope="row"
            >
              {{
                $t(
                  `subscription.feature-sections.${section.id}.features.${feature}`
                )
              }}
            </th>
            <td
              v-for="plan in plans"
              :key="plan.type"
              class="py-5 px-6 font-semibold tooltip-wrapper"
              :class="plan.highlight ? 'text-indigo-600' : 'text-gray-600'"
            >
              <div class="flex justify-center">
                <template v-if="getFeature(plan, feature)">
                  <span
                    v-if="getFeature(plan, feature)?.content"
                    class="block text-sm"
                    >{{ $t(getFeature(plan, feature)?.content) }}</span
                  >
                  <heroicons-solid:check v-else class="w-5 h-5" />
                </template>
                <template v-else>
                  <heroicons-solid:minus class="w-5 h-5" />
                </template>
                <template v-if="getFeature(plan, feature)?.tooltip">
                  <heroicons-solid:question-mark-circle class="w-5 h-5 ml-1" />
                  <span
                    v-if="getFeature(plan, feature)?.tooltip"
                    class="tooltip whitespace-nowrap"
                  >
                    {{ $t(getFeature(plan, feature)?.tooltip) }}
                  </span>
                </template>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
      <tfoot>
        <tr class="border-t border-gray-200">
          <th class="sr-only" scope="row">Choose your plan</th>
          <td v-for="plan in plans" :key="plan.type" class="pt-5 px-6">
            <a
              v-if="!plan.isFreePlan"
              href="https://hub.bytebase.com"
              target="_blank"
              class="block w-full py-4 bg-gray-800 border border-gray-800 rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-gray-900"
            >
              {{
                $t("subscription.buy", {
                  plan: $t(`subscription.plan.${plan.title}.title`),
                })
              }}
            </a>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script lang="ts">
import { reactive, computed, watch, PropType } from "vue";
import {
  Plan,
  Subscription,
  PlanType,
  FEATURE_SECTIONS,
  FREE_PLAN,
  TEAM_PLAN,
  ENTERPRISE_PLAN,
} from "../types";
import { useI18n } from "vue-i18n";

interface LocalState {
  isMonthly: boolean;
  instanceCount: number;
}

interface LocalPlan extends Plan {
  label: string;
  image: string;
  price: string;
  buttonText: string;
  highlight: boolean;
  isFreePlan: boolean;
}

const minimumInstanceCount = 5;

export default {
  name: "PricingTable",
  props: {
    subscription: {
      required: false,
      default: undefined,
      type: Object as PropType<Subscription>,
    },
  },
  setup(props) {
    const { t } = useI18n();
    const state = reactive<LocalState>({
      isMonthly: false,
      instanceCount: props.subscription?.instanceCount ?? minimumInstanceCount,
    });

    watch(
      () => props.subscription,
      (val) =>
        (state.instanceCount = val?.instanceCount ?? minimumInstanceCount)
    );

    const getInstancePricePerYear = (plan: Plan): number => {
      return (
        (state.instanceCount - minimumInstanceCount) *
        plan.pricePerInstancePerMonth *
        12
      );
    };

    const getPlanPrice = (plan: Plan): number => {
      if (plan.type !== PlanType.TEAM) return plan.unitPrice;
      return plan.unitPrice + getInstancePricePerYear(plan);
    };

    const plans = computed((): LocalPlan[] => {
      return [FREE_PLAN, TEAM_PLAN, ENTERPRISE_PLAN].map((plan) => ({
        ...plan,
        image: new URL(
          `../assets/plan-${plan.title.toLowerCase()}.png`,
          import.meta.url
        ).href,
        price:
          plan.type === PlanType.ENTERPRISE
            ? t("subscription.contact-us")
            : t("subscription.price", { price: getPlanPrice(plan) }),
        buttonText: getButtonText(plan),
        highlight: plan.type === PlanType.TEAM,
        isFreePlan: plan.type === PlanType.FREE,
        label: t(`subscription.plan.${plan.title}.label`),
      }));
    });

    const getFeature = (plan: Plan, feature: string) => {
      return plan.features.find((f) => f.id === feature);
    };

    const getButtonText = (plan: Plan): string => {
      if (plan.type === PlanType.FREE) return t("subscription.deploy");
      if (plan.type === PlanType.ENTERPRISE)
        return t("subscription.contact-us");
      if (plan.type === props.subscription?.plan)
        return t("subscription.current-plan");
      if (plan.trialDays && plan.trialPrice) {
        return t("subscription.start-trial", {
          price: plan.trialPrice,
          days: plan.trialDays,
        });
      }
      return t("subscription.subscribe");
    };

    const onButtonClick = (plan: Plan) => {
      if (plan.type === PlanType.TEAM) {
        window.open("https://hub.bytebase.com/", "__blank");
      } else if (plan.type === PlanType.ENTERPRISE) {
        window.open(
          "mailto:support@bytebase.com?subject=Request for enterprise plan"
        );
      } else {
        window.open("https://docs.bytebase.com/", "__blank");
      }
    };

    return {
      state,
      plans,
      sections: FEATURE_SECTIONS,
      getFeature,
      onButtonClick,
      minimumInstanceCount,
    };
  },
};
</script>
