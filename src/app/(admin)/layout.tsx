"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppstoreOutlined,
  BarChartOutlined,
  BulbOutlined,
  HomeOutlined,
  MoonOutlined,
  QrcodeOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Segmented, Space, Switch, Typography } from "antd";
import { useLocale } from "@/hooks/useLocale";
import { useTheme } from "@/hooks/useTheme";

const { Sider, Header, Content } = Layout;
const { Text, Title } = Typography;

const navItems = [
  {
    key: "/admin/dashboard",
    icon: <SettingOutlined />,
    labelKey: "nav.dashboard",
  },
  {
    key: "/admin/menu",
    icon: <AppstoreOutlined />,
    labelKey: "nav.menu",
  },
  {
    key: "/admin/analytics",
    icon: <BarChartOutlined />,
    labelKey: "nav.analytics",
  },
  {
    key: "/menu",
    icon: <QrcodeOutlined />,
    labelKey: "nav.qrMenu",
  },
  {
    key: "/",
    icon: <HomeOutlined />,
    labelKey: "nav.home",
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useLocale();
  const { isDark, setMode } = useTheme();

  const selectedKey = navItems.find((item) => pathname.startsWith(item.key))?.key ?? "/admin/dashboard";

  return (
    <Layout className="admin-layout">
      <Sider width={240} className="admin-sider" breakpoint="lg" collapsedWidth={0}>
        <div className="admin-logo">
          <Text style={{ color: "#8da2fb", letterSpacing: 1 }}>QR MENU</Text>
          <Title level={4} style={{ color: "white", margin: 0 }}>
            {t("nav.admin")}
          </Title>
        </div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[selectedKey]}
          items={navItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: <Link href={item.key}>{t(item.labelKey)}</Link>,
          }))}
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <Space size="middle">
            <Text type="secondary">{t("nav.adminSubtitle")}</Text>
          </Space>
          <Space size="middle">
            <Space size="small">
              <BulbOutlined />
              <Switch
                checked={isDark}
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<BulbOutlined />}
                onChange={(checked) => setMode(checked ? "dark" : "light")}
              />
            </Space>
            <Segmented
              size="middle"
              options={[
                { label: "VI", value: "vi" },
                { label: "EN", value: "en" },
              ]}
              value={locale}
              onChange={(value) => setLocale(value as "vi" | "en")}
            />
          </Space>
        </Header>
        <Content className="admin-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
