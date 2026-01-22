"use client";

import dynamic from "next/dynamic";
import { Alert, Avatar, Button, Card, Col, Form, Input, Row, Space, Spin, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson, notifyError } from "@/lib/api/client";
import { useLocale } from "@/hooks/useLocale";
import type { AuthPublicUser } from "@/features/auth/types";

// Dynamic import for Three.js component (no SSR)
const ProfileIdentityScene = dynamic(
  () => import("@/features/admin/components/ProfileIdentityScene"),
  { ssr: false, loading: () => <div className="profile-scene-loading"><Spin size="large" /></div> }
);

const { Title, Paragraph } = Typography;

type ProfileFormValues = {
  name: string;
  email: string;
};

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ProfileResponse = {
  user?: AuthPublicUser | null;
  message?: string;
};

export default function ProfilePage() {
  const { t } = useLocale();
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const response = await fetchJson<ProfileResponse>("/api/auth/profile", { cache: "no-store" });
      const user = response.user ?? null;
      setProfileUser(user);
      profileForm.setFieldsValue({
        name: user?.name ?? "",
        email: user?.email ?? "",
      });
      setPendingFile(null);
      setPendingPreviewUrl(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.errors.profileFailed");
      setProfileError(message);
    } finally {
      setProfileLoading(false);
    }
  }, [profileForm, t]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      let imageUrl = profileUser?.image_url ?? "";
      if (pendingFile) {
        setUploadingAvatar(true);
        try {
          const formData = new FormData();
          formData.append("file", pendingFile);
          const uploadResponse = await fetchJson<{ url: string }>("/api/menu/upload", {
            method: "POST",
            body: formData,
          });
          imageUrl = uploadResponse.url;
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
      const message = err instanceof Error ? err.message : t("auth.errors.profileUpdateFailed");
      setProfileError(message);
    } finally {
      setProfileSaving(false);
    }
  };

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
      const message = err instanceof Error ? err.message : t("auth.errors.changePasswordFailed");
      setPasswordError(message);
    } finally {
      setPasswordSaving(false);
    }
  };

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(pendingFile);
    setPendingPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [pendingFile]);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      notifyError(t("menu.errors.uploadInvalid"));
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notifyError(t("menu.errors.uploadTooLarge"));
      event.target.value = "";
      return;
    }
    setPendingFile(file);
    event.target.value = "";
  };

  const profileInitial = (profileUser?.name?.trim() || profileUser?.email?.trim() || "QR").charAt(0).toUpperCase();
  const profileAvatarSrc =
    pendingPreviewUrl ??
    (typeof profileUser?.image_url === "string" && profileUser.image_url.trim() ? profileUser.image_url.trim() : undefined);

  return (
    <div className="profile-shell">
      {/* 3D Background Header */}
      <div className="profile-3d-header">
        <ProfileIdentityScene />
        <div className="profile-header-overlay">
          <div className="profile-header-content">
            <div className="profile-header-badge">
              <UserOutlined /> {t("profile.title")}
            </div>
            <h1 className="profile-header-title">
              {t("profile.heroTitle")}
            </h1>
            <p className="profile-header-subtitle">
              {t("profile.subtitle")}
            </p>
          </div>
        </div>
      </div>

    <Space orientation="vertical" size="large" className="profile-page profile-content">
      <Card variant="borderless" className="glass-card profile-hero" loading={profileLoading}>
        <div className="profile-hero-content">
          <Avatar size={72} className="profile-avatar" src={profileAvatarSrc}>
            {profileInitial}
          </Avatar>
          <div className="profile-hero-text">
            <Title level={3} className="profile-hero-title">
              {t("profile.title")}
            </Title>
            <Paragraph type="secondary" className="profile-hero-subtitle">
              {t("profile.subtitle")}
            </Paragraph>
            <div className="profile-hero-meta">
              <span className="profile-meta-item">
                {t("auth.nameLabel")}: {profileUser?.name || "--"}
              </span>
              <span className="profile-meta-item">
                {t("auth.emailLabel")}: {profileUser?.email || "--"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Row gutter={[24, 24]} className="profile-grid">
        <Col xs={24} lg={12}>
          <Card variant="borderless" className="glass-card profile-card">
            <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Title level={4} className="profile-section-title">
                  {t("profile.infoTitle")}
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {t("profile.infoSubtitle")}
                </Paragraph>
              </div>
              <Form form={profileForm} layout="vertical" onFinish={handleProfileSubmit} className="profile-form">
                <Form.Item
                  label={t("auth.nameLabel")}
                  name="name"
                  rules={[{ required: true, message: t("auth.nameLabel") }]}
                >
                  <Input placeholder={t("auth.namePlaceholder")} />
                </Form.Item>
                <Form.Item label={t("auth.emailLabel")} name="email">
                  <Input disabled />
                </Form.Item>
                <Space className="profile-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFileChange}
                  />
                  <Button onClick={handlePickFile} loading={uploadingAvatar}>
                    {t("menu.actions.upload")}
                  </Button>
                  <Button type="primary" htmlType="submit" loading={profileSaving || uploadingAvatar}>
                    {t("profile.save")}
                  </Button>
                </Space>
              </Form>
              {profileSuccess && <Alert title={profileSuccess} type="success" showIcon className="profile-alert" />}
              {profileError && <Alert title={profileError} type="error" showIcon className="profile-alert" />}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card variant="borderless" className="glass-card profile-card">
            <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <Title level={4} className="profile-section-title">
                  {t("profile.passwordTitle")}
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {t("profile.passwordSubtitle")}
                </Paragraph>
              </div>
              <Form form={passwordForm} layout="vertical" onFinish={handlePasswordSubmit} className="profile-form">
                <Form.Item
                  label={t("profile.currentPassword")}
                  name="currentPassword"
                  rules={[{ required: true, message: t("profile.currentPassword") }]}
                >
                  <Input.Password placeholder={t("auth.currentPasswordPlaceholder")} />
                </Form.Item>
                <Form.Item
                  label={t("profile.newPassword")}
                  name="newPassword"
                  rules={[{ required: true, message: t("profile.newPassword") }]}
                >
                  <Input.Password placeholder={t("auth.newPasswordPlaceholder")} />
                </Form.Item>
                <Form.Item
                  label={t("profile.confirmPassword")}
                  name="confirmPassword"
                  dependencies={["newPassword"]}
                  rules={[
                    { required: true, message: t("profile.confirmPassword") },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("newPassword") === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error(t("profile.passwordMismatch")));
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder={t("auth.newPasswordPlaceholder")} />
                </Form.Item>
                <Space className="profile-actions">
                  <Button type="primary" htmlType="submit" loading={passwordSaving}>
                    {t("profile.updatePassword")}
                  </Button>
                </Space>
              </Form>
              {passwordSuccess && <Alert title={passwordSuccess} type="success" showIcon className="profile-alert" />}
              {passwordError && <Alert title={passwordError} type="error" showIcon className="profile-alert" />}
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
    </div>
  );
}
