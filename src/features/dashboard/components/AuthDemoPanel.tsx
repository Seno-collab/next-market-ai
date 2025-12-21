"use client";

import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import { useMemo } from "react";
import { useAuthDemo } from "@/hooks/useAuthDemo";
import type { AuthCredentials, RegisterPayload } from "@/features/auth/types";
import { useLocale } from "@/hooks/useLocale";

const { Text, Title } = Typography;

const defaultRegisterValues: RegisterPayload = {
  name: "Admin",
  email: "admin@example.com",
  password: "demo1234",
};

const defaultLoginValues: AuthCredentials = {
  email: defaultRegisterValues.email,
  password: defaultRegisterValues.password,
};

export function AuthDemoPanel() {
  const { t } = useLocale();
  const [registerForm] = Form.useForm<RegisterPayload>();
  const [loginForm] = Form.useForm<AuthCredentials>();
  const [passwordForm] = Form.useForm<{ currentPassword: string; newPassword: string }>();

  const {
    user,
    profile,
    tokens,
    message,
    error,
    loadingAction,
    register,
    login,
    logout,
    fetchProfile,
    refreshAuth,
    changePassword,
    isAuthenticated,
  } = useAuthDemo();

  const loadingMap = useMemo(
    () => ({
      register: loadingAction === "register",
      login: loadingAction === "login",
      logout: loadingAction === "logout",
      profile: loadingAction === "profile",
      refresh: loadingAction === "refresh",
      changePassword: loadingAction === "changePassword",
    }),
    [loadingAction],
  );

  return (
    <Card title={t("dashboard.authTitle")} variant="borderless" bodyStyle={{ padding: 32 }}>
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Title level={5}>{t("dashboard.registerTitle")}</Title>
            <Form
              form={registerForm}
              layout="vertical"
              initialValues={defaultRegisterValues}
              onFinish={(values) => register(values)}
            >
              <Form.Item
                label={t("auth.nameLabel")}
                name="name"
                rules={[{ required: true, message: t("auth.nameLabel") }]}
              >
                <Input placeholder={t("auth.namePlaceholder")} autoComplete="name" />
              </Form.Item>
              <Form.Item
                label={t("auth.emailLabel")}
                name="email"
                rules={[{ required: true, message: t("auth.emailLabel") }]}
              >
                <Input type="email" autoComplete="email" />
              </Form.Item>
              <Form.Item
                label={t("auth.passwordLabel")}
                name="password"
                rules={[{ required: true, message: t("auth.passwordLabel") }]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loadingMap.register} block>
                {t("dashboard.registerButton")}
              </Button>
            </Form>
          </Col>
          <Col xs={24} md={12}>
            <Title level={5}>{t("dashboard.loginTitle")}</Title>
            <Form
              form={loginForm}
              layout="vertical"
              initialValues={defaultLoginValues}
              onFinish={(values) => login(values)}
            >
              <Form.Item
                label={t("auth.emailLabel")}
                name="email"
                rules={[{ required: true, message: t("auth.emailLabel") }]}
              >
                <Input type="email" autoComplete="email" />
              </Form.Item>
              <Form.Item
                label={t("auth.passwordLabel")}
                name="password"
                rules={[{ required: true, message: t("auth.passwordLabel") }]}
              >
                <Input.Password autoComplete="current-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loadingMap.login} block>
                {t("dashboard.loginButton")}
              </Button>
            </Form>
          </Col>
        </Row>

        <Divider />

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Button block onClick={() => fetchProfile()} loading={loadingMap.profile} disabled={!isAuthenticated}>
              {t("dashboard.fetchProfile")}
            </Button>
          </Col>
          <Col xs={24} md={8}>
            <Button
              block
              onClick={() => refreshAuth()}
              loading={loadingMap.refresh}
              disabled={!tokens?.refreshToken}
            >
              {t("dashboard.refreshToken")}
            </Button>
          </Col>
          <Col xs={24} md={8}>
            <Button danger block onClick={() => logout()} loading={loadingMap.logout} disabled={!isAuthenticated}>
              {t("dashboard.logout")}
            </Button>
          </Col>
        </Row>

        <Form
          form={passwordForm}
          layout="inline"
          onFinish={(values) => changePassword(values)}
          style={{ flexWrap: "wrap", gap: 16 }}
        >
          <Form.Item
            label={t("dashboard.currentPassword")}
            name="currentPassword"
            rules={[{ required: true, message: t("dashboard.currentPassword") }]}
          >
            <Input.Password
              autoComplete="current-password"
              placeholder={t("auth.currentPasswordPlaceholder")}
            />
          </Form.Item>
          <Form.Item
            label={t("dashboard.newPassword")}
            name="newPassword"
            rules={[{ required: true, message: t("dashboard.newPassword") }]}
          >
            <Input.Password autoComplete="new-password" placeholder={t("auth.newPasswordPlaceholder")} />
          </Form.Item>
          <Form.Item>
            <Button
              type="dashed"
              htmlType="submit"
              loading={loadingMap.changePassword}
              disabled={!isAuthenticated}
            >
              {t("dashboard.changePassword")}
            </Button>
          </Form.Item>
        </Form>

        {message && <Alert message={t(`auth.success.${message}`)} type="success" showIcon />}
        {error && <Alert message={error} type="error" showIcon />}

        <Space orientation="vertical" style={{ width: "100%" }}>
          <Tag color={isAuthenticated ? "green" : "default"}>
            {isAuthenticated ? `${t("dashboard.signedIn")}: ${user?.email}` : t("dashboard.signedOut")}
          </Tag>
          {tokens && (
            <div>
              <Text strong>{t("dashboard.tokens")}</Text>
              <div className="api-response">{JSON.stringify(tokens, null, 2)}</div>
            </div>
          )}
          {profile && (
            <div>
              <Text strong>{t("dashboard.profile")}</Text>
              <div className="api-response">{JSON.stringify(profile, null, 2)}</div>
            </div>
          )}
        </Space>
      </Space>
    </Card>
  );
}
