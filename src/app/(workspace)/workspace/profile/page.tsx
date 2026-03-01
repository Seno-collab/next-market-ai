"use client";

import dynamic from "next/dynamic";
import {
	AreaChartOutlined,
	CameraOutlined,
	CheckCircleOutlined,
	KeyOutlined,
	LockOutlined,
	RiseOutlined,
	SafetyOutlined,
	ThunderboltOutlined,
	TrophyOutlined,
	UserOutlined,
} from "@ant-design/icons";
import { Button, Col, Form, Grid, Input, Row, Spin } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson, notifyError } from "@/lib/api/client";
import { useLocale } from "@/hooks/useLocale";
import type { AuthPublicUser } from "@/features/auth/types";

const { useBreakpoint } = Grid;
const GRID_GUTTER = { xs: 8, sm: 16, md: 24, lg: 32 } as const;

const ProfileIdentityScene = dynamic(
	() => import("@/features/workspace/components/ProfileIdentityScene"),
	{
		ssr: false,
		loading: () => (
			<div className="tp-scene-loading">
				<Spin size="large" />
			</div>
		),
	},
);

type ProfileFormValues = { name: string; email: string };
type PasswordFormValues = {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
};
type ProfileResponse = { user?: AuthPublicUser | null; message?: string };

const TRADER_STATS = [
	{
		label: "Total P&L",
		value: "+$24,310",
		icon: <RiseOutlined />,
		color: "#34d399",
	},
	{
		label: "Win Rate",
		value: "72.4%",
		icon: <TrophyOutlined />,
		color: "#22d3ee",
	},
	{
		label: "Total Trades",
		value: "108",
		icon: <AreaChartOutlined />,
		color: "#60a5fa",
	},
	{
		label: "Account Tier",
		value: "PRO",
		icon: <ThunderboltOutlined />,
		color: "#fbbf24",
	},
] as const;

export default function ProfilePage() {
	const { t } = useLocale();
	const screens = useBreakpoint();
	const [profileForm] = Form.useForm<ProfileFormValues>();
	const [passwordForm] = Form.useForm<PasswordFormValues>();

	const [profileLoading, setProfileLoading] = useState(false);
	const [profileSaving, setProfileSaving] = useState(false);
	const [passwordSaving, setPasswordSaving] = useState(false);
	const [profileError, setProfileError] = useState<string | null>(null);
	const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
	const [profileUser, setProfileUser] = useState<AuthPublicUser | null>(null);
	const [uploadingAvatar, setUploadingAvatar] = useState(false);
	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(
		null,
	);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	/* ── load profile ── */
	const loadProfile = useCallback(async () => {
		setProfileLoading(true);
		setProfileError(null);
		try {
			const res = await fetchJson<ProfileResponse>("/api/auth/profile", {
				cache: "no-store",
			});
			const user = res.user ?? null;
			setProfileUser(user);
			profileForm.setFieldsValue({
				name: user?.name ?? "",
				email: user?.email ?? "",
			});
			setPendingFile(null);
			setPendingPreviewUrl(null);
		} catch (err) {
			setProfileError(
				err instanceof Error ? err.message : t("auth.errors.profileFailed"),
			);
		} finally {
			setProfileLoading(false);
		}
	}, [profileForm, t]);

	useEffect(() => {
		loadProfile();
	}, [loadProfile]);

	/* ── save profile ── */
	const handleProfileSubmit = async (values: ProfileFormValues) => {
		setProfileSaving(true);
		setProfileError(null);
		setProfileSuccess(null);
		try {
			let imageUrl = profileUser?.image_url ?? "";
			if (pendingFile) {
				setUploadingAvatar(true);
				try {
					const fd = new FormData();
					fd.append("file", pendingFile);
					const up = await fetchJson<{ url: string }>("/api/menu/upload", {
						method: "POST",
						body: fd,
					});
					imageUrl = up.url;
				} finally {
					setUploadingAvatar(false);
				}
			}
			await fetchJson<ProfileResponse>("/api/auth/profile", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: values.name, image_url: imageUrl }),
			});
			setProfileSuccess(t("profile.success.update"));
			await loadProfile();
		} catch (err) {
			setProfileError(
				err instanceof Error
					? err.message
					: t("auth.errors.profileUpdateFailed"),
			);
		} finally {
			setProfileSaving(false);
		}
	};

	/* ── change password ── */
	const handlePasswordSubmit = async (values: PasswordFormValues) => {
		setPasswordSaving(true);
		setPasswordError(null);
		setPasswordSuccess(null);
		try {
			await fetchJson<{ message?: string }>("/api/auth/change-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					currentPassword: values.currentPassword,
					newPassword: values.newPassword,
				}),
			});
			setPasswordSuccess(t("profile.success.password"));
			passwordForm.resetFields();
		} catch (err) {
			setPasswordError(
				err instanceof Error
					? err.message
					: t("auth.errors.changePasswordFailed"),
			);
		} finally {
			setPasswordSaving(false);
		}
	};

	/* ── avatar preview ── */
	useEffect(() => {
		if (!pendingFile) {
			setPendingPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(pendingFile);
		setPendingPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [pendingFile]);

	const handlePickFile = () => fileInputRef.current?.click();
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			notifyError(t("menu.errors.uploadInvalid"));
			e.target.value = "";
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			notifyError(t("menu.errors.uploadTooLarge"));
			e.target.value = "";
			return;
		}
		setPendingFile(file);
		e.target.value = "";
	};

	const profileInitial = (
		profileUser?.name?.trim() ||
		profileUser?.email?.trim() ||
		"T"
	)
		.charAt(0)
		.toUpperCase();
	const profileAvatarSrc =
		pendingPreviewUrl ??
		(typeof profileUser?.image_url === "string" && profileUser.image_url.trim()
			? profileUser.image_url.trim()
			: undefined);

	return (
		<div className="tp-shell">
			{/* ── 3D header ── */}
			<div className="tp-3d-header">
				<ProfileIdentityScene />
				<div className="tp-header-overlay">
					<div className="tp-header-content">
						<div className="tp-eyebrow">
							<UserOutlined /> TRADER PROFILE
						</div>
						<h1 className="tp-title">Account Overview</h1>
						<p className="tp-subtitle">
							Manage your trading identity, credentials and performance stats.
						</p>
					</div>
				</div>
			</div>

			<div className="tp-body">
				{/* ── Hero: avatar panel + stats ── */}
				<div className="tp-hero-grid">
					<Row gutter={[GRID_GUTTER, GRID_GUTTER]}>
						<Col xs={24} sm={24} md={24} lg={8} xl={7} xxl={6}>
							{/* Avatar card */}
							<div className="tp-avatar-panel">
								{profileLoading ? (
									<div className="tp-avatar-loading">
										<Spin />
									</div>
								) : (
									<>
										<div className="tp-avatar-wrap">
											<div className="tp-avatar-ring" />
											{profileAvatarSrc ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img
													src={profileAvatarSrc}
													alt="avatar"
													className="tp-avatar-img"
												/>
											) : (
												<div className="tp-avatar-fallback">{profileInitial}</div>
											)}
											<button
												className="tp-avatar-cam"
												onClick={handlePickFile}
												title="Change photo"
											>
												<CameraOutlined />
											</button>
										</div>

										<div className="tp-trader-info">
											<div className="tp-trader-name">
												{profileUser?.name || "Trader"}
											</div>
											<div className="tp-trader-email">
												{profileUser?.email || ""}
											</div>
											<div className="tp-trader-badges">
												<span className="tp-tier-badge">
													<ThunderboltOutlined /> PRO
												</span>
												<span className="tp-online-badge">
													<span className="tp-online-dot" />{" "}
													{screens.md ? "Online" : "Live"}
												</span>
											</div>
										</div>
									</>
								)}
							</div>
						</Col>

						{/* Stat cards */}
						<Col xs={24} sm={24} md={24} lg={16} xl={17} xxl={18}>
							<div className="tp-stats-row">
								<Row gutter={[GRID_GUTTER, GRID_GUTTER]}>
									{TRADER_STATS.map((s) => (
										<Col
											key={s.label}
											xs={24}
											sm={12}
											md={12}
											lg={12}
											xl={6}
											xxl={6}
										>
											<div
												className="tp-stat-card"
												style={{ "--tp-accent": s.color } as React.CSSProperties}
											>
												<div className="tp-stat-icon" style={{ color: s.color }}>
													{s.icon}
												</div>
												<div className="tp-stat-val" style={{ color: s.color }}>
													{s.value}
												</div>
												<div className="tp-stat-label">{s.label}</div>
											</div>
										</Col>
									))}
								</Row>
							</div>
						</Col>
					</Row>
				</div>

				{/* ── Forms ── */}
				<div className="tp-form-grid">
					<Row gutter={[GRID_GUTTER, GRID_GUTTER]}>
						<Col xs={24} sm={24} md={12} lg={12} xl={12} xxl={12}>
					{/* Profile info */}
					<div className="tp-panel">
						<div className="tp-panel-hd">
							<UserOutlined className="tp-panel-icon" />
							<div>
								<div className="tp-panel-title">{t("profile.infoTitle")}</div>
								<div className="tp-panel-sub">{t("profile.infoSubtitle")}</div>
							</div>
						</div>

						<Form
							form={profileForm}
							layout="vertical"
							onFinish={handleProfileSubmit}
							className="tp-form"
						>
							<Form.Item
								label={t("auth.nameLabel")}
								name="name"
								rules={[{ required: true, message: t("auth.nameLabel") }]}
								className="tp-form-item"
							>
								<Input
									prefix={<UserOutlined />}
									placeholder={t("auth.namePlaceholder")}
									className="tp-input"
								/>
							</Form.Item>
							<Form.Item
								label={t("auth.emailLabel")}
								name="email"
								className="tp-form-item"
							>
								<Input disabled className="tp-input" />
							</Form.Item>

							<div className="tp-actions">
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									hidden
									onChange={handleFileChange}
								/>
								<Button
									onClick={handlePickFile}
									loading={uploadingAvatar}
									className="tp-btn-secondary"
								>
									<CameraOutlined /> {t("menu.actions.upload")}
								</Button>
								<Button
									type="primary"
									htmlType="submit"
									loading={profileSaving || uploadingAvatar}
									className="tp-btn-primary"
								>
									<CheckCircleOutlined /> {t("profile.save")}
								</Button>
							</div>
						</Form>

						{profileSuccess && (
							<div className="tp-feedback tp-feedback-ok">
								<SafetyOutlined /> {profileSuccess}
							</div>
						)}
						{profileError && (
							<div className="tp-feedback tp-feedback-err">{profileError}</div>
						)}
					</div>
						</Col>

					{/* Password */}
						<Col xs={24} sm={24} md={12} lg={12} xl={12} xxl={12}>
					<div className="tp-panel">
						<div className="tp-panel-hd">
							<KeyOutlined className="tp-panel-icon" />
							<div>
								<div className="tp-panel-title">
									{t("profile.passwordTitle")}
								</div>
								<div className="tp-panel-sub">
									{t("profile.passwordSubtitle")}
								</div>
							</div>
						</div>

						<Form
							form={passwordForm}
							layout="vertical"
							onFinish={handlePasswordSubmit}
							className="tp-form"
						>
							<Form.Item
								label={t("profile.currentPassword")}
								name="currentPassword"
								rules={[
									{ required: true, message: t("profile.currentPassword") },
								]}
								className="tp-form-item"
							>
								<Input.Password
									prefix={<LockOutlined />}
									placeholder={t("auth.currentPasswordPlaceholder")}
									className="tp-input"
								/>
							</Form.Item>
							<Form.Item
								label={t("profile.newPassword")}
								name="newPassword"
								rules={[{ required: true, message: t("profile.newPassword") }]}
								className="tp-form-item"
							>
								<Input.Password
									prefix={<LockOutlined />}
									placeholder={t("auth.newPasswordPlaceholder")}
									className="tp-input"
								/>
							</Form.Item>
							<Form.Item
								label={t("profile.confirmPassword")}
								name="confirmPassword"
								dependencies={["newPassword"]}
								rules={[
									{ required: true, message: t("profile.confirmPassword") },
									({ getFieldValue }) => ({
										validator(_, value) {
											if (!value || getFieldValue("newPassword") === value)
												return Promise.resolve();
											return Promise.reject(
												new Error(t("profile.passwordMismatch")),
											);
										},
									}),
								]}
								className="tp-form-item"
							>
								<Input.Password
									prefix={<LockOutlined />}
									placeholder={t("auth.newPasswordPlaceholder")}
									className="tp-input"
								/>
							</Form.Item>

							<div className="tp-actions">
								<Button
									type="primary"
									htmlType="submit"
									loading={passwordSaving}
									className="tp-btn-primary"
								>
									<KeyOutlined /> {t("profile.updatePassword")}
								</Button>
							</div>
						</Form>

						{passwordSuccess && (
							<div className="tp-feedback tp-feedback-ok">
								<SafetyOutlined /> {passwordSuccess}
							</div>
						)}
						{passwordError && (
							<div className="tp-feedback tp-feedback-err">{passwordError}</div>
						)}
					</div>
						</Col>
					</Row>
				</div>

				{/* ── Security strip ── */}
				<div className="tp-security-strip">
					<Row gutter={[GRID_GUTTER, GRID_GUTTER]} style={{ width: "100%" }}>
						<Col xs={24} sm={12} md={12} lg={6} xl={6} xxl={6}>
							<div className="tp-sec-item">
								<SafetyOutlined />{" "}
								{screens.md ? "End-to-end encrypted session" : "Encrypted session"}
							</div>
						</Col>
						<Col xs={24} sm={12} md={12} lg={6} xl={6} xxl={6}>
							<div className="tp-sec-item">
								<LockOutlined /> 2FA ready
							</div>
						</Col>
						<Col xs={24} sm={12} md={12} lg={6} xl={6} xxl={6}>
							<div className="tp-sec-item">
								<CheckCircleOutlined /> Account verified
							</div>
						</Col>
						<Col xs={24} sm={12} md={12} lg={6} xl={6} xxl={6}>
							<div className="tp-sec-item">
								<ThunderboltOutlined /> PRO tier active
							</div>
						</Col>
					</Row>
				</div>
			</div>
		</div>
	);
}
