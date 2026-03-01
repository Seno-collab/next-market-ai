"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
	AppstoreOutlined,
	LineChartOutlined,
	MenuFoldOutlined,
	MenuUnfoldOutlined,
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
	Drawer,
	Grid,
	Layout,
	Menu,
	Segmented,
	Space,
	Typography,
} from "antd";
import { useLocale } from "@/hooks/useLocale";
import { useHeartbeat } from "@/features/auth/hooks/useHeartbeat";

const { Sider, Header, Content } = Layout;
const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

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
	const screens = useBreakpoint();
	const isMobile = screens.lg === false;
	const [desktopCollapsed, setDesktopCollapsed] = useState(false);
	const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
	useHeartbeat(true);

	useEffect(() => {
		if (!isMobile) {
			setMobileDrawerOpen(false);
		}
	}, [isMobile]);

	const selectedKey =
		navItems.find((item) => pathname.startsWith(item.key))?.key ??
		"/workspace/dashboard";

	return (
		<Layout className="admin-layout">
			{!isMobile && (
				<Sider
					width={240}
					className={`admin-sider${desktopCollapsed ? " is-collapsed" : ""}`}
					breakpoint="lg"
					collapsedWidth={0}
					collapsible
					collapsed={desktopCollapsed}
					onCollapse={(value) => setDesktopCollapsed(value)}
					onBreakpoint={(broken) => setDesktopCollapsed(broken)}
					trigger={null}
				>
					<div className="admin-logo">
						<Text className="admin-logo-mark">COIN SWING TRADER</Text>
						<Title level={4} className="admin-logo-title">
							{t("nav.admin")}
						</Title>
					</div>
					<Menu
						mode="inline"
						theme="dark"
						selectedKeys={[selectedKey]}
						inlineCollapsed={desktopCollapsed}
						items={navItems.map((item) => ({
							key: item.key,
							icon: item.icon,
							label: <Link href={item.key}>{t(item.labelKey)}</Link>,
						}))}
					/>
				</Sider>
			)}
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
							icon={
								isMobile
									? mobileDrawerOpen
										? <MenuFoldOutlined />
										: <MenuUnfoldOutlined />
									: desktopCollapsed
										? <MenuUnfoldOutlined />
										: <MenuFoldOutlined />
							}
							onClick={() => {
								if (isMobile) {
									setMobileDrawerOpen((prev) => !prev);
									return;
								}
								setDesktopCollapsed((prev) => !prev);
							}}
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
			<Drawer
				placement="left"
				open={isMobile && mobileDrawerOpen}
				onClose={() => setMobileDrawerOpen(false)}
				size="80vw"
				className="admin-mobile-drawer"
			>
				<div className="admin-logo admin-mobile-logo">
					<Text className="admin-logo-mark">COIN SWING TRADER</Text>
					<Title level={4} className="admin-logo-title">
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
					onClick={() => setMobileDrawerOpen(false)}
				/>
			</Drawer>
		</Layout>
	);
}
