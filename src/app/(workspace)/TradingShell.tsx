"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
	AppstoreOutlined,
	BulbOutlined,
	LineChartOutlined,
	MenuFoldOutlined,
	MenuUnfoldOutlined,
	MoonOutlined,
	LogoutOutlined,
	RobotOutlined,
	SettingOutlined,
	SwapOutlined,
	ThunderboltOutlined,
	UserOutlined,
	WalletOutlined,
} from "@ant-design/icons";
import {
	Button,
	Layout,
	Menu,
	Segmented,
	Space,
	Switch,
	Typography,
} from "antd";
import { useLocale } from "@/hooks/useLocale";
import { useTheme } from "@/hooks/useTheme";
import { useHeartbeat } from "@/features/auth/hooks/useHeartbeat";

const { Sider, Header, Content } = Layout;
const { Text, Title } = Typography;

// Dynamic import for Three.js component (no SSR)
const HeaderScene = dynamic(() => import("@/components/layout/HeaderScene"), {
	ssr: false,
	loading: () => <div className="header-scene-loading" />,
});

const navItems = [
	{
		key: "/workspace/dashboard",
		icon: <SettingOutlined />,
		labelKey: "nav.dashboard",
	},
	{
		key: "/workspace/profile",
		icon: <UserOutlined />,
		labelKey: "nav.profile",
	},
	{
		key: "/workspace/trading",
		icon: <LineChartOutlined />,
		labelKey: "nav.trading",
	},
	{
		key: "/workspace/symbols",
		icon: <AppstoreOutlined />,
		labelKey: "nav.symbols",
	},
	{
		key: "/workspace/portfolio",
		icon: <WalletOutlined />,
		labelKey: "nav.portfolio",
	},
	{
		key: "/workspace/transactions",
		icon: <SwapOutlined />,
		labelKey: "nav.transactions",
	},
	{
		key: "/workspace/analysis",
		icon: <ThunderboltOutlined />,
		labelKey: "nav.analysis",
	},
	{
		key: "/workspace/coinai",
		icon: <RobotOutlined />,
		labelKey: "nav.coinai",
	},
	{
		key: "/logout",
		icon: <LogoutOutlined />,
		labelKey: "nav.logout",
	},
];

export default function TradingShell({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const { t, locale, setLocale } = useLocale();
	const { isDark, setMode } = useTheme();
	const [collapsed, setCollapsed] = useState(false);
	useHeartbeat(true);

	const selectedKey =
		navItems.find((item) => pathname.startsWith(item.key))?.key ??
		"/workspace/dashboard";

	return (
		<Layout className="admin-layout">
			{/* Mobile overlay — tap to close sidebar */}
			{!collapsed && (
				<div
					className="admin-mobile-overlay"
					onClick={() => setCollapsed(true)}
					aria-hidden="true"
				/>
			)}
			<Sider
				width={240}
				className={`admin-sider${collapsed ? " is-collapsed" : ""}`}
				breakpoint="lg"
				collapsedWidth={80}
				collapsible
				collapsed={collapsed}
				onCollapse={(value) => setCollapsed(value)}
				onBreakpoint={(broken) => setCollapsed(broken)}
				trigger={null}
			>
				<div className="admin-logo">
					<Text className="admin-logo-mark">TRADING SENO</Text>
					<Title level={4} className="admin-logo-title">
						{t("nav.admin")}
					</Title>
				</div>
				<Menu
					mode="inline"
					theme={isDark ? "dark" : "light"}
					selectedKeys={[selectedKey]}
					inlineCollapsed={collapsed}
					items={navItems.map((item) => ({
						key: item.key,
						icon: item.icon,
						label: <Link href={item.key}>{t(item.labelKey)}</Link>,
					}))}
				/>
			</Sider>
			<Layout>
				<Header className="admin-header app-header-3d">
					{/* Three.js Background */}
					<div className="header-scene-container">
						<HeaderScene />
					</div>

					{/* Content */}
					<Space size="middle" style={{ position: "relative", zIndex: 2 }}>
						<Button
							type="text"
							className="admin-sider-toggle"
							icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
							onClick={() => setCollapsed((prev) => !prev)}
							aria-label="Toggle menu"
						/>
						<Text
							type="secondary"
							style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
						>
							{t("nav.adminSubtitle")}
						</Text>
					</Space>
					<Space
						size="middle"
						className="admin-header-actions"
						style={{ position: "relative", zIndex: 2 }}
					>
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
							className="admin-locale-toggle"
							name="admin-locale-toggle"
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
