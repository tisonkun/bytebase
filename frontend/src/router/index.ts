import { nextTick } from "vue";
import {
  createRouter,
  createWebHistory,
  RouteLocationNormalized,
  RouteRecordRaw,
} from "vue-router";
import BodyLayout from "../layouts/BodyLayout.vue";
import DashboardLayout from "../layouts/DashboardLayout.vue";
import DatabaseLayout from "../layouts/DatabaseLayout.vue";
import InstanceLayout from "../layouts/InstanceLayout.vue";
import SplashLayout from "../layouts/SplashLayout.vue";
import SqlEditorLayout from "../layouts/SqlEditorLayout.vue";
import { t } from "../plugins/i18n";
import { store } from "../store";
import { Database, QuickActionType, Sheet } from "../types";
import { idFromSlug, isDBAOrOwner, isOwner } from "../utils";
// import PasswordReset from "../views/auth/PasswordReset.vue";
import Signin from "../views/auth/Signin.vue";
import Signup from "../views/auth/Signup.vue";
import DashboardSidebar from "../views/DashboardSidebar.vue";
import Home from "../views/Home.vue";

const HOME_MODULE = "workspace.home";
const AUTH_MODULE = "auth";
const SIGNIN_MODULE = "auth.signin";
const SIGNUP_MODULE = "auth.signup";
const ACTIVATE_MODULE = "auth.activate";
const PASSWORD_RESET_MODULE = "auth.password.reset";
const PASSWORD_FORGOT_MODULE = "auth.password.forgot";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/auth",
    name: AUTH_MODULE,
    component: SplashLayout,
    children: [
      {
        path: "",
        name: SIGNIN_MODULE,
        meta: { title: () => t("common.sign-in") },
        component: Signin,
        alias: "signin",
        props: true,
      },
      {
        path: "signup",
        name: SIGNUP_MODULE,
        meta: { title: () => t("common.sign-up") },
        component: Signup,
        props: true,
      },
      // TODO(tianzhou): Disable activate page for now, requires implementing invite
      // {
      //   path: "activate",
      //   name: ACTIVATE_MODULE,
      //   meta: { title: () => "Activate" },
      //   component: Activate,
      //   props: true,
      // },
      // {
      //   path: "password-reset",
      //   name: PASSWORD_RESET_MODULE,
      //   meta: { title: () => "Reset Password" },
      //   component: PasswordReset,
      //   props: true,
      // },
      {
        path: "password-forgot",
        name: PASSWORD_FORGOT_MODULE,
        meta: { title: () => `${t("auth.password-forgot")}` },
        component: () => import("../views/auth/PasswordForgot.vue"),
        props: true,
      },
    ],
  },
  {
    path: "/oauth/callback",
    name: "oauth-callback",
    component: () => import("../views/OAuthCallback.vue"),
  },
  {
    path: "/",
    component: DashboardLayout,
    children: [
      {
        path: "",
        components: { body: BodyLayout },
        children: [
          {
            path: "",
            name: HOME_MODULE,
            meta: {
              quickActionListByRole: () => {
                const ownerList: QuickActionType[] = store.getters[
                  "subscription/feature"
                ]("bb.feature.dba-workflow")
                  ? [
                      "quickaction.bb.database.schema.update",
                      "quickaction.bb.database.data.update",
                      "quickaction.bb.database.create",
                      "quickaction.bb.database.troubleshoot",
                      "quickaction.bb.instance.create",
                      "quickaction.bb.project.create",
                      "quickaction.bb.user.manage",
                    ]
                  : [
                      "quickaction.bb.database.schema.update",
                      "quickaction.bb.database.data.update",
                      "quickaction.bb.database.create",
                      "quickaction.bb.instance.create",
                      "quickaction.bb.project.create",
                      "quickaction.bb.user.manage",
                    ];
                const dbaList: QuickActionType[] = store.getters[
                  "subscription/feature"
                ]("bb.feature.dba-workflow")
                  ? [
                      "quickaction.bb.database.schema.update",
                      "quickaction.bb.database.data.update",
                      "quickaction.bb.database.create",
                      "quickaction.bb.database.troubleshoot",
                      "quickaction.bb.instance.create",
                      "quickaction.bb.project.create",
                    ]
                  : [
                      "quickaction.bb.database.schema.update",
                      "quickaction.bb.database.data.update",
                      "quickaction.bb.database.create",
                      "quickaction.bb.instance.create",
                      "quickaction.bb.project.create",
                    ];
                const developerList: QuickActionType[] = store.getters[
                  "subscription/feature"
                ]("bb.feature.dba-workflow")
                  ? [
                      "quickaction.bb.database.schema.update",
                      "quickaction.bb.database.data.update",
                      "quickaction.bb.database.request",
                      "quickaction.bb.database.troubleshoot",
                      "quickaction.bb.project.create",
                    ]
                  : [
                      "quickaction.bb.database.schema.update",
                      "quickaction.bb.database.data.update",
                      "quickaction.bb.database.create",
                      "quickaction.bb.project.create",
                    ];
                return new Map([
                  ["OWNER", ownerList],
                  ["DBA", dbaList],
                  ["DEVELOPER", developerList],
                ]);
              },
            },
            components: {
              content: Home,
              leftSidebar: DashboardSidebar,
            },
            props: {
              content: true,
              leftSidebar: true,
            },
          },
          {
            path: "403",
            name: "error.403",
            components: {
              content: () => import("../views/Page403.vue"),
              leftSidebar: DashboardSidebar,
            },
            props: {
              content: true,
              leftSidebar: true,
            },
          },
          {
            path: "404",
            name: "error.404",
            components: {
              content: () => import("../views/Page404.vue"),
              leftSidebar: DashboardSidebar,
            },
            props: {
              content: true,
              leftSidebar: true,
            },
          },
          {
            path: "inbox",
            name: "workspace.inbox",
            meta: { title: () => t("common.inbox") },
            components: {
              content: () => import("../views/Inbox.vue"),
              leftSidebar: DashboardSidebar,
            },
            props: {
              content: true,
              leftSidebar: true,
            },
          },
          {
            path: "anomaly-center",
            name: "workspace.anomaly-center",
            meta: { title: () => t("anomaly-center") },
            components: {
              content: () => import("../views/AnomalyCenterDashboard.vue"),
              leftSidebar: DashboardSidebar,
            },
            props: {
              content: true,
              leftSidebar: true,
            },
          },
          {
            path: "archive",
            name: "workspace.archive",
            meta: { title: () => t("common.archive") },
            components: {
              content: () => import("../views/Archive.vue"),
              leftSidebar: DashboardSidebar,
            },
            props: {
              content: true,
              leftSidebar: true,
            },
          },
          {
            // "u" stands for user. Strictly speaking, it's not accurate because we
            // may refer to other principal type in the future. But from the endusers'
            // perspective, they are more familiar with the "user" concept.
            // We make an exception to use a shorthand here because it's a commonly
            // accessed endpoint, and maybe in the future, we will further provide a
            // shortlink like u/<<uid>>
            path: "u/:principalId",
            name: "workspace.profile",
            meta: {
              title: (route: RouteLocationNormalized) => {
                const principalId = route.params.principalId as string;
                return store.getters["principal/principalById"](principalId)
                  .name;
              },
            },
            components: {
              content: () => import("../views/ProfileDashboard.vue"),
              leftSidebar: DashboardSidebar,
            },
            props: { content: true },
          },
          {
            path: "setting",
            name: "setting",
            meta: { title: () => t("common.setting") },
            components: {
              content: () => import("../layouts/SettingLayout.vue"),
              leftSidebar: () => import("../views/SettingSidebar.vue"),
            },
            props: {
              content: true,
              leftSidebar: true,
            },
            children: [
              {
                path: "",
                name: "setting.profile",
                meta: { title: () => t("settings.sidebar.profile") },
                component: () => import("../views/ProfileDashboard.vue"),
                alias: "profile",
                props: true,
              },
              {
                path: "general",
                name: "setting.workspace.general",
                meta: { title: () => t("settings.sidebar.general") },
                component: () => import("../views/SettingWorkspaceGeneral.vue"),
                props: true,
              },
              {
                path: "label",
                name: "setting.workspace.label",
                meta: { title: () => t("settings.sidebar.labels") },
                component: () => import("../views/SettingWorkspaceLabel.vue"),
                props: true,
              },
              {
                path: "agent",
                name: "setting.workspace.agent",
                meta: { title: () => t("common.agents") },
                component: () => import("../views/SettingWorkspaceAgent.vue"),
                props: true,
              },
              {
                path: "member",
                name: "setting.workspace.member",
                meta: { title: () => t("settings.sidebar.members") },
                component: () => import("../views/SettingWorkspaceMember.vue"),
                props: true,
              },
              {
                path: "version-control",
                name: "setting.workspace.version-control",
                meta: { title: () => t("settings.sidebar.version-control") },
                component: () => import("../views/SettingWorkspaceVCS.vue"),
                props: true,
              },
              {
                path: "version-control/new",
                name: "setting.workspace.version-control.create",
                meta: { title: () => t("repository.add-git-provider") },
                component: () =>
                  import("../views/SettingWorkspaceVCSCreate.vue"),
                props: true,
              },
              {
                path: "version-control/:vcsSlug",
                name: "setting.workspace.version-control.detail",
                meta: {
                  title: (route: RouteLocationNormalized) => {
                    const slug = route.params.vcsSlug as string;
                    return store.getters["vcs/vcsById"](idFromSlug(slug)).name;
                  },
                },
                component: () =>
                  import("../views/SettingWorkspaceVCSDetail.vue"),
                props: true,
              },
              {
                path: "subscription",
                name: "setting.workspace.subscription",
                meta: { title: () => t("settings.sidebar.subscription") },
                component: () =>
                  import("../views/SettingWorkspaceSubscription.vue"),
                props: true,
              },
              {
                path: "billing",
                name: "setting.workspace.billing",
                meta: { title: () => t("common.billings") },
                component: () => import("../views/SettingWorkspaceBilling.vue"),
                props: true,
              },
              {
                path: "integration/slack",
                name: "setting.workspace.integration.slack",
                meta: { title: () => t("common.slack") },
                component: () =>
                  import("../views/SettingWorkspaceIntegrationSlack.vue"),
                props: true,
              },
            ],
          },
          {
            path: "issue",
            name: "workspace.issue",
            meta: {
              title: () => t("common.issue"),
            },
            components: {
              content: () => import("../views/IssueDashboard.vue"),
              leftSidebar: DashboardSidebar,
            },
            props: { content: true, leftSidebar: true },
          },
          {
            path: "environment",
            name: "workspace.environment",
            meta: {
              title: () => t("common.environment"),
              quickActionListByRole: () => {
                return new Map([
                  [
                    "OWNER",
                    [
                      "quickaction.bb.environment.create",
                      "quickaction.bb.environment.reorder",
                    ],
                  ],
                  [
                    "DBA",
                    [
                      "quickaction.bb.environment.create",
                      "quickaction.bb.environment.reorder",
                    ],
                  ],
                ]);
              },
            },
            components: {
              content: () => import("../views/EnvironmentDashboard.vue"),
              leftSidebar: DashboardSidebar,
            },
            props: { content: true, leftSidebar: true },
          },
          {
            path: "environment/:environmentSlug",
            name: "workspace.environment.detail",
            meta: {
              title: (route: RouteLocationNormalized) => {
                const slug = route.params.environmentSlug as string;
                return store.getters["environment/environmentById"](
                  idFromSlug(slug)
                ).name;
              },
              allowBookmark: true,
            },
            components: {
              content: () => import("../views/EnvironmentDetail.vue"),
              leftSidebar: DashboardSidebar,
            },
            props: { content: true },
          },
          {
            path: "project",
            name: "workspace.project",
            meta: {
              title: () => t("common.project"),
              quickActionListByRole: () => {
                return new Map([
                  [
                    "OWNER",
                    [
                      "quickaction.bb.project.create",
                      "quickaction.bb.project.default",
                    ],
                  ],
                  [
                    "DBA",
                    [
                      "quickaction.bb.project.create",
                      "quickaction.bb.project.default",
                    ],
                  ],
                  [
                    "DEVELOPER",
                    [
                      "quickaction.bb.project.create",
                      "quickaction.bb.project.default",
                    ],
                  ],
                ]);
              },
            },
            components: {
              content: () => import("../views/ProjectDashboard.vue"),
              leftSidebar: DashboardSidebar,
            },
            props: { content: true, leftSidebar: true },
          },
          {
            path: "project/:projectSlug",
            components: {
              content: () => import("../layouts/ProjectLayout.vue"),
              leftSidebar: DashboardSidebar,
            },
            meta: {
              quickActionListByRole: (route: RouteLocationNormalized) => {
                const slug = route.params.projectSlug as string;
                const project = store.getters["project/projectById"](
                  idFromSlug(slug)
                );

                if (project.rowStatus == "NORMAL") {
                  const currentUser = store.getters["auth/currentUser"]();
                  let allowEditProject = false;
                  if (isDBAOrOwner(currentUser.role)) {
                    allowEditProject = true;
                  } else {
                    for (const member of project.memberList) {
                      if (member.principal.id == currentUser.id) {
                        allowEditProject = true;
                        break;
                      }
                    }
                  }

                  const actionList: string[] = allowEditProject
                    ? project.tenantMode == "DISABLED"
                      ? [
                          "quickaction.bb.database.schema.update",
                          "quickaction.bb.database.data.update",
                          "quickaction.bb.database.create",
                          "quickaction.bb.project.database.transfer",
                        ]
                      : [
                          "quickaction.bb.database.schema.update",
                          "quickaction.bb.database.create",
                          "quickaction.bb.project.database.transfer",
                        ]
                    : [];
                  return new Map([
                    ["OWNER", actionList],
                    ["DBA", actionList],
                    ["DEVELOPER", actionList],
                  ]);
                }
                return new Map();
              },
            },
            props: { content: true },
            children: [
              {
                path: "",
                name: "workspace.project.detail",
                meta: {
                  title: (route: RouteLocationNormalized) => {
                    const slug = route.params.projectSlug as string;
                    return store.getters["project/projectById"](
                      idFromSlug(slug)
                    ).name;
                  },
                  allowBookmark: true,
                },
                component: () => import("../views/ProjectDetail.vue"),
                props: true,
              },
              {
                path: "webhook/new",
                name: "workspace.project.hook.create",
                meta: {
                  title: () => t("project.webhook.create-webhook"),
                },
                component: () => import("../views/ProjectWebhookCreate.vue"),
                props: true,
              },
              {
                path: "webhook/:projectWebhookSlug",
                name: "workspace.project.hook.detail",
                meta: {
                  title: (route: RouteLocationNormalized) => {
                    const projectSlug = route.params.projectSlug as string;
                    const projectWebhookSlug = route.params
                      .projectWebhookSlug as string;
                    return `${t("common.webhook")} - ${
                      store.getters["projectWebhook/projectWebhookById"](
                        idFromSlug(projectSlug),
                        idFromSlug(projectWebhookSlug)
                      ).name
                    }`;
                  },
                  allowBookmark: true,
                },
                component: () => import("../views/ProjectWebhookDetail.vue"),
                props: true,
              },
            ],
          },
          {
            path: "instance",
            name: "workspace.instance",
            meta: {
              title: () => t("common.instance"),
              quickActionListByRole: () => {
                return new Map([
                  ["OWNER", ["quickaction.bb.instance.create"]],
                  ["DBA", ["quickaction.bb.instance.create"]],
                ]);
              },
            },
            components: {
              content: () => import("../views/InstanceDashboard.vue"),
              leftSidebar: DashboardSidebar,
            },
            props: { content: true, leftSidebar: true },
          },
          {
            path: "db",
            name: "workspace.database",
            meta: {
              title: () => t("common.database"),
              quickActionListByRole: () => {
                const ownerList: QuickActionType[] = store.getters[
                  "subscription/feature"
                ]("bb.feature.dba-workflow")
                  ? [
                      "quickaction.bb.database.schema.update",
                      "quickaction.bb.database.data.update",
                      "quickaction.bb.database.create",
                      "quickaction.bb.database.troubleshoot",
                    ]
                  : [
                      "quickaction.bb.database.schema.update",
                      "quickaction.bb.database.data.update",
                      "quickaction.bb.database.create",
                    ];
                const dbaList: QuickActionType[] = store.getters[
                  "subscription/feature"
                ]("bb.feature.dba-workflow")
                  ? [
                      "quickaction.bb.database.schema.update",
                      "quickaction.bb.database.data.update",
                      "quickaction.bb.database.create",
                      "quickaction.bb.database.troubleshoot",
                    ]
                  : [
                      "quickaction.bb.database.schema.update",
                      "quickaction.bb.database.data.update",
                      "quickaction.bb.database.create",
                    ];
                const developerList: QuickActionType[] = store.getters[
                  "subscription/feature"
                ]("bb.feature.dba-workflow")
                  ? [
                      "quickaction.bb.database.schema.update",
                      "quickaction.bb.database.data.update",
                      "quickaction.bb.database.request",
                      "quickaction.bb.database.troubleshoot",
                    ]
                  : [
                      "quickaction.bb.database.schema.update",
                      "quickaction.bb.database.data.update",
                      "quickaction.bb.database.create",
                    ];
                return new Map([
                  ["OWNER", ownerList],
                  ["DBA", dbaList],
                  ["DEVELOPER", developerList],
                ]);
              },
            },
            components: {
              content: () => import("../views/DatabaseDashboard.vue"),
              leftSidebar: DashboardSidebar,
            },
            props: { content: true, leftSidebar: true },
          },
          {
            path: "db/grant",
            name: "workspace.database.grant",
            meta: {
              title: () => t("datasource.grant-database"),
            },
            components: {
              content: () => import("../views/DatabaseGrant.vue"),
              leftSidebar: DashboardSidebar,
            },
            props: { content: true, leftSidebar: true },
          },
          {
            path: "db/:databaseSlug",
            components: {
              content: DatabaseLayout,
              leftSidebar: DashboardSidebar,
            },
            props: { content: true },
            children: [
              {
                path: "",
                name: "workspace.database.detail",
                meta: {
                  title: (route: RouteLocationNormalized) => {
                    const slug = route.params.databaseSlug as string;
                    if (slug.toLowerCase() == "new") {
                      return t("common.new");
                    }
                    return store.getters["database/databaseById"](
                      idFromSlug(slug)
                    ).name;
                  },
                  allowBookmark: true,
                },
                component: () => import("../views/DatabaseDetail.vue"),
                props: true,
              },
              {
                path: "table/:tableName",
                name: "workspace.database.table.detail",
                meta: {
                  title: (route: RouteLocationNormalized) => {
                    return `${t("db.tables")} - ${route.params.tableName}`;
                  },
                  allowBookmark: true,
                },
                component: () => import("../views/TableDetail.vue"),
                props: true,
              },
              {
                path: "datasource/:dataSourceSlug",
                name: "workspace.database.datasource.detail",
                meta: {
                  title: (route: RouteLocationNormalized) => {
                    const slug = route.params.dataSourceSlug as string;
                    if (slug.toLowerCase() == "new") {
                      return t("common.new");
                    }
                    return `${t("common.data-source")} - ${
                      store.getters["dataSource/dataSourceById"](
                        idFromSlug(slug)
                      ).name
                    }`;
                  },
                  allowBookmark: true,
                },
                component: () => import("../views/DataSourceDetail.vue"),
                props: true,
              },
              {
                path: "history/:migrationHistorySlug",
                name: "workspace.database.history.detail",
                meta: {
                  title: (route: RouteLocationNormalized) => {
                    const slug = route.params.migrationHistorySlug as string;
                    return store.getters["instance/migrationHistoryById"](
                      idFromSlug(slug)
                    ).version;
                  },
                  allowBookmark: true,
                },
                component: () => import("../views/MigrationHistoryDetail.vue"),
                props: true,
              },
            ],
          },
          {
            path: "instance/:instanceSlug",
            components: {
              content: InstanceLayout,
              leftSidebar: DashboardSidebar,
            },
            props: { content: true },
            children: [
              {
                path: "",
                name: "workspace.instance.detail",
                meta: {
                  title: (route: RouteLocationNormalized) => {
                    const slug = route.params.instanceSlug as string;
                    if (slug.toLowerCase() == "new") {
                      return t("common.new");
                    }
                    return store.getters["instance/instanceById"](
                      idFromSlug(slug)
                    ).name;
                  },
                },
                component: () => import("../views/InstanceDetail.vue"),
                props: true,
              },
            ],
          },
          {
            path: "issue/:issueSlug",
            name: "workspace.issue.detail",
            meta: {
              title: (route: RouteLocationNormalized) => {
                const slug = route.params.issueSlug as string;
                if (slug.toLowerCase() == "new") {
                  return t("common.new");
                }
                return store.getters["issue/issueById"](idFromSlug(slug)).name;
              },
              allowBookmark: true,
            },
            components: {
              content: () => import("../views/IssueDetail.vue"),
              leftSidebar: DashboardSidebar,
            },
            props: { content: true },
          },
        ],
      },
    ],
  },
  {
    path: "/sql-editor",
    name: "sql-editor",
    component: SqlEditorLayout,
    children: [
      {
        path: "",
        name: "sql-editor.home",
        meta: { title: () => "SQL Editor" },
        component: () => import("../views/SqlEditor/SqlEditor.vue"),
        props: true,
      },
      {
        path: "/sql-editor/:connectionSlug",
        name: "sql-editor.detail",
        meta: { title: () => "SQL Editor" },
        component: () => import("../views/SqlEditor/SqlEditor.vue"),
        props: true,
      },
      {
        path: "/sql-editor/:connectionSlug/:sheetSlug",
        name: "sql-editor.share",
        meta: { title: () => "SQL Editor" },
        component: () => import("../views/SqlEditor/SqlEditor.vue"),
        props: true,
      },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  linkExactActiveClass: "bg-link-hover",
  scrollBehavior(to /*, from, savedPosition */) {
    if (to.hash) {
      return {
        el: to.hash,
        behavior: "smooth",
      };
    }
  },
});

router.beforeEach((to, from, next) => {
  console.debug("Router %s -> %s", from.name, to.name);

  const isLoggedIn = store.getters["auth/isLoggedIn"]();

  const fromModule = from.name
    ? from.name.toString().split(".")[0]
    : HOME_MODULE;
  const toModule = to.name ? to.name.toString().split(".")[0] : HOME_MODULE;

  if (toModule != fromModule) {
    store.dispatch("router/setBackPath", from.fullPath);
  }

  // OAuth callback route is a relay to receive the OAuth callback and dispatch the corresponding OAuth event. It's called in the following scenarios:
  // - Login via OAuth
  // - Setup VCS provider
  // - Setup GitOps workflow in a project
  if (to.name === "oauth-callback") {
    next();
  }

  if (
    to.name === SIGNIN_MODULE ||
    to.name === SIGNUP_MODULE ||
    to.name === ACTIVATE_MODULE ||
    to.name === PASSWORD_RESET_MODULE ||
    to.name === PASSWORD_FORGOT_MODULE
  ) {
    if (isLoggedIn) {
      next({ name: HOME_MODULE, replace: true });
    } else {
      if (to.name === ACTIVATE_MODULE) {
        const token = to.query.token;
        if (token) {
          // TODO(tianzhou): Needs to validate the activate token
          next();
        } else {
          // Go to signup if token is missing
          next({ name: SIGNUP_MODULE, replace: true });
        }
      } else {
        next();
      }
    }
    return;
  } else {
    if (!isLoggedIn) {
      next({ name: SIGNIN_MODULE, replace: true });
      return;
    }
  }

  const currentUser = store.getters["auth/currentUser"]();

  if (to.name?.toString().startsWith("setting.workspace.version-control")) {
    // Returns 403 immediately if not Owner. Otherwise, we may need to fetch the VCS detail
    if (!isOwner(currentUser.role)) {
      next({
        name: "error.403",
        replace: false,
      });
      return;
    }
  }

  if (to.name === "workspace.instance") {
    if (
      !store.getters["subscription/feature"]("bb.feature.dba-workflow") ||
      isDBAOrOwner(currentUser.role)
    ) {
      next();
    } else {
      next({
        name: "error.403",
        replace: false,
      });
    }
    return;
  }

  if (to.name?.toString().startsWith("workspace.database.datasource")) {
    if (
      !store.getters["subscription/feature"]("bb.feature.data-source") ||
      !isDBAOrOwner(currentUser.role)
    ) {
      next({
        name: "error.403",
        replace: false,
      });
      return;
    }
  }

  if (
    to.name === "error.403" ||
    to.name === "error.404" ||
    to.name === "error.500" ||
    to.name === "workspace.home" ||
    to.name === "workspace.inbox" ||
    to.name === "workspace.anomaly-center" ||
    to.name === "workspace.project" ||
    to.name === "workspace.database" ||
    to.name === "workspace.archive" ||
    to.name === "workspace.issue" ||
    to.name === "workspace.environment" ||
    to.name === "sql-editor.home" ||
    (to.name?.toString().startsWith("setting") &&
      to.name?.toString() != "setting.workspace.version-control.detail")
  ) {
    next();
    return;
  }

  // We may just change the anchor (e.g. in Issue Detail view), thus we don't need
  // to fetch the data to verify its existence since we have already verified before.
  if (to.path == from.path) {
    next();
    return;
  }

  const routerSlug = store.getters["router/routeSlug"](to);
  const principalId = routerSlug.principalId;
  const environmentSlug = routerSlug.environmentSlug;
  const projectSlug = routerSlug.projectSlug;
  const projectWebhookSlug = routerSlug.projectWebhookSlug;
  const issueSlug = routerSlug.issueSlug;
  const instanceSlug = routerSlug.instanceSlug;
  const databaseSlug = routerSlug.databaseSlug;
  const tableName = routerSlug.tableName;
  const dataSourceSlug = routerSlug.dataSourceSlug;
  const migrationHistorySlug = routerSlug.migrationHistorySlug;
  const vcsSlug = routerSlug.vcsSlug;
  const connectionSlug = routerSlug.connectionSlug;
  const sheetSlug = routerSlug.sheetSlug;

  if (principalId) {
    store
      .dispatch("principal/fetchPrincipalById", principalId)
      .then(() => {
        next();
      })
      .catch((error) => {
        next({
          name: "error.404",
          replace: false,
        });
        throw error;
      });
    return;
  }

  if (environmentSlug) {
    if (
      store.getters["environment/environmentById"](idFromSlug(environmentSlug))
    ) {
      next();
      return;
    }
    next({
      name: "error.404",
      replace: false,
    });
  }

  if (projectSlug) {
    store
      .dispatch("project/fetchProjectById", idFromSlug(projectSlug))
      .then(() => {
        if (!projectWebhookSlug) {
          next();
        } else {
          store
            .dispatch("projectWebhook/fetchProjectWebhookById", {
              projectId: idFromSlug(projectSlug),
              projectWebhookId: idFromSlug(projectWebhookSlug),
            })
            .then(() => {
              next();
            })
            .catch((error) => {
              next({
                name: "error.404",
                replace: false,
              });
              throw error;
            });
        }
      })
      .catch((error) => {
        next({
          name: "error.404",
          replace: false,
        });
        throw error;
      });
    return;
  }

  if (issueSlug) {
    if (issueSlug.toLowerCase() == "new") {
      // For preparing the database if user visits creating issue url directly.
      if (to.query.databaseList) {
        for (const databaseId of (to.query.databaseList as string).split(",")) {
          store.dispatch("database/fetchDatabaseById", { databaseId });
        }
      }
      next();
      return;
    }
    store
      .dispatch("issue/fetchIssueById", idFromSlug(issueSlug))
      .then(() => {
        next();
      })
      .catch((error) => {
        next({
          name: "error.404",
          replace: false,
        });
        throw error;
      });
    return;
  }

  if (databaseSlug) {
    if (databaseSlug.toLowerCase() == "grant") {
      next();
      return;
    }
    store
      .dispatch("database/fetchDatabaseById", {
        databaseId: idFromSlug(databaseSlug),
      })
      .then((database: Database) => {
        if (!tableName && !dataSourceSlug && !migrationHistorySlug) {
          next();
        } else if (tableName) {
          store
            .dispatch("table/fetchTableByDatabaseIdAndTableName", {
              databaseId: database.id,
              tableName,
            })
            .then(() => {
              next();
            })
            .catch((error) => {
              next({
                name: "error.404",
                replace: false,
              });
              throw error;
            });
        } else if (dataSourceSlug) {
          store
            .dispatch("dataSource/fetchDataSourceById", {
              dataSourceId: idFromSlug(dataSourceSlug),
              databaseId: database.id,
            })
            .then(() => {
              next();
            })
            .catch((error) => {
              next({
                name: "error.404",
                replace: false,
              });
              throw error;
            });
        } else if (migrationHistorySlug) {
          store
            .dispatch("instance/fetchMigrationHistoryById", {
              instanceId: database.instance.id,
              migrationHistoryId: idFromSlug(migrationHistorySlug),
            })
            .then(() => {
              next();
            })
            .catch((error) => {
              next({
                name: "error.404",
                replace: false,
              });
              throw error;
            });
        }
      })
      .catch((error) => {
        next({
          name: "error.404",
          replace: false,
        });
        throw error;
      });
    return;
  }

  if (instanceSlug) {
    store
      .dispatch("instance/fetchInstanceById", idFromSlug(instanceSlug))
      .then(() => {
        next();
      })
      .catch((error) => {
        next({
          name: "error.404",
          replace: false,
        });
        throw error;
      });
    return;
  }

  if (vcsSlug) {
    store
      .dispatch("vcs/fetchVCSById", idFromSlug(vcsSlug))
      .then(() => {
        next();
      })
      .catch((error) => {
        next({
          name: "error.404",
          replace: false,
        });
        throw error;
      });
    return;
  }

  if (connectionSlug) {
    const [instanceSlug, instanceId, databaseSlug, databaseId] =
      connectionSlug.split("_");
    store
      .dispatch("sqlEditor/fetchConnectionByInstanceIdAndDatabaseId", {
        instanceId: Number(instanceId),
        databaseId: Number(databaseId),
      })
      .then(() => {
        // for sharing the sheet to others
        if (sheetSlug) {
          const [_, sheetId] = sheetSlug.split("_");
          store
            .dispatch("sheet/fetchSheetById", sheetId)
            .then((sheet: Sheet) => {
              store.dispatch("tab/addTab", {
                name: sheet.name,
                statement: sheet.statement,
                isSaved: true,
              });
              store.dispatch("tab/updateCurrentTab", {
                sheetId: sheet.id,
              });
              store.dispatch("sqlEditor/setSqlEditorState", {
                sharedSheet: sheet,
              });

              next();
            })
            .catch((error) => {
              next({
                name: "error.404",
                replace: false,
              });
              throw error;
            });
        }
        next();
      })
      .catch((error) => {
        next({
          name: "error.404",
          replace: false,
        });
        throw error;
      });
    return;
  }

  next({
    name: "error.404",
    replace: false,
  });
});

router.afterEach((to /*, from */) => {
  // Needs to use nextTick otherwise title will still be the one from the previous route.
  nextTick(() => {
    if (to.meta.title) {
      document.title = to.meta.title(to);
    } else {
      document.title = "Bytebase";
    }
  });
});
