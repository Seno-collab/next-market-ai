"use client";

import { CloudSyncOutlined } from "@ant-design/icons";
import { Button, Flex, Layout, Segmented, Space, Typography } from "antd";
import { siteConfig } from "@/config/site";
import { useLocale } from "@/hooks/useLocale";

const { Header } = Layout;
const { Text, Title } = Typography;

type AppHeaderProps = {
  onRefresh: () => void;
  loading?: boolean;
};

export default function AppHeader({ onRefresh, loading = false }: Readonly<AppHeaderProps>) {
  const { locale, setLocale, t } = useLocale();

  return (
    <Header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(2, 8, 23, 0.85)",
        backdropFilter: "blur(12px)",
        paddingInline: 32,
      }}
    >
      <Flex vertical>
        <Text style={{ color: "#8da2fb", letterSpacing: 1 }}>{t(siteConfig.nameKey)}</Text>
        <Title level={4} style={{ color: "white", margin: 0 }}>
          {t(siteConfig.taglineKey)}
        </Title>
      </Flex>
      <Space size="middle">
        <Segmented
          size="middle"
          name="app-header-locale-toggle"
          options={[
            { label: "VI", value: "vi" },
            { label: "EN", value: "en" },
          ]}
          value={locale}
          onChange={(value) => setLocale(value as "vi" | "en")}
        />
        <Button
          type="primary"
          size="large"
          icon={<CloudSyncOutlined />}
          loading={loading}
          onClick={onRefresh}
        >
          {t(siteConfig.actions.refreshLabelKey)}
        </Button>
      </Space>
    </Header>
  );
}
