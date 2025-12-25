import type { ReactNode } from "react";
import { ApiOutlined, RocketOutlined, ThunderboltOutlined, UsergroupAddOutlined } from "@ant-design/icons";

type IconComponent = typeof ApiOutlined;

export type FeatureHighlight = {
  titleKey: string;
  descriptionKey: string;
  Icon: IconComponent;
};

export type SummaryStat = {
  titleKey: string;
  value: string;
  Icon: IconComponent;
  color: string;
};

export type QuickAction = {
  key: string;
  labelKey: string;
  descriptionKey: string;
  icon: ReactNode;
  type?: "primary" | "default" | "dashed";
};

export type SystemStatus = {
  id: string;
  nameKey: string;
  valueKey: string;
  status: "success" | "processing" | "warning" | "error";
};

export type ActivityEntry = {
  id: string;
  labelKey: string;
  descriptionKey: string;
  timestampKey: string;
  status: "success" | "info" | "warning";
};

export const featureHighlights: FeatureHighlight[] = [
  {
    titleKey: "features.antd.title",
    descriptionKey: "features.antd.description",
    Icon: ThunderboltOutlined,
  },
  {
    titleKey: "features.three.title",
    descriptionKey: "features.three.description",
    Icon: RocketOutlined,
  },
  {
    titleKey: "features.api.title",
    descriptionKey: "features.api.description",
    Icon: ApiOutlined,
  },
];

export const summaryStats: SummaryStat[] = [
  {
    titleKey: "stats.performance",
    value: "SSR + SSG",
    Icon: ThunderboltOutlined,
    color: "#faad14",
  },
  {
    titleKey: "stats.uiComponents",
    value: "100+",
    Icon: RocketOutlined,
    color: "#13c2c2",
  },
];

export const quickActions: QuickAction[] = [
  {
    key: "deploy",
    labelKey: "quickActions.deploy.label",
    descriptionKey: "quickActions.deploy.description",
    icon: <RocketOutlined />,
    type: "primary",
  },
  {
    key: "invite",
    labelKey: "quickActions.invite.label",
    descriptionKey: "quickActions.invite.description",
    icon: <UsergroupAddOutlined />,
  },
  {
    key: "api-key",
    labelKey: "quickActions.apiKey.label",
    descriptionKey: "quickActions.apiKey.description",
    icon: <ApiOutlined />,
  },
];

export const systemStatuses: SystemStatus[] = [
  {
    id: "edge",
    nameKey: "systemStatus.edge.name",
    valueKey: "systemStatus.edge.value",
    status: "success",
  },
  {
    id: "database",
    nameKey: "systemStatus.database.name",
    valueKey: "systemStatus.database.value",
    status: "warning",
  },
  {
    id: "storage",
    nameKey: "systemStatus.storage.name",
    valueKey: "systemStatus.storage.value",
    status: "processing",
  },
  {
    id: "realtime",
    nameKey: "systemStatus.realtime.name",
    valueKey: "systemStatus.realtime.value",
    status: "error",
  },
];

export const activityFeed: ActivityEntry[] = [
  {
    id: "1",
    labelKey: "activity.deploy.label",
    descriptionKey: "activity.deploy.description",
    timestampKey: "activity.deploy.timestamp",
    status: "success",
  },
  {
    id: "2",
    labelKey: "activity.apiKey.label",
    descriptionKey: "activity.apiKey.description",
    timestampKey: "activity.apiKey.timestamp",
    status: "info",
  },
  {
    id: "3",
    labelKey: "activity.latency.label",
    descriptionKey: "activity.latency.description",
    timestampKey: "activity.latency.timestamp",
    status: "warning",
  },
];
