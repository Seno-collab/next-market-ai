"use client";

import { ApiOutlined, CloudSyncOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Space, Statistic, Tag, Typography } from "antd";
import type { ApiStatus } from "@/types/api";
import { useLocale } from "@/hooks/useLocale";

const { Text } = Typography;

type StatusCardProps = {
  data: ApiStatus | null;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
};

export function StatusCard({ data, error, loading, onRefresh }: StatusCardProps) {
  const { t } = useLocale();

  const statusTag = (() => {
    if (error) {
      return <Tag color="red">{t("status.tagError")}</Tag>;
    }
    if (!data) {
      return <Tag color="blue">{t("status.tagLoading")}</Tag>;
    }
    return <Tag color="green">{t("status.tagOk")}</Tag>;
  })();

  return (
    <Card
      title={
        <Space>
          <ApiOutlined />
          <span>{t("status.title")}</span>
        </Space>
      }
      extra={statusTag}
      actions={[
        <Button key="retry" type="link" onClick={onRefresh} loading={loading} icon={<CloudSyncOutlined />}>
          {t("actions.refresh")}
        </Button>,
      ]}
    >
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        {data && (
          <>
            <Flex gap="middle">
              <Statistic title={t("status.latency")} value={data.latencyMs} suffix="ms" />
              <Statistic title={t("status.environment")} value={data.environment} />
            </Flex>
            <div className="api-response">{JSON.stringify(data, null, 2)}</div>
          </>
        )}
        {!data && !error && (
          <Text type="secondary">{t("status.waiting")}</Text>
        )}
        {error && <Text type="danger">{error}</Text>}
      </Space>
    </Card>
  );
}
