"use client";

import { Button, Form, Input, InputNumber, Select, Space, Switch } from "antd";
import type { FormInstance } from "antd";
import { menuCategories } from "@/features/menu/constants";
import { useLocale } from "@/hooks/useLocale";

export type MenuItemFormValues = {
  name: string;
  description?: string;
  category: string;
  price: number;
  available: boolean;
};

type MenuItemFormProps = {
  form: FormInstance<MenuItemFormValues>;
  onSubmit: (values: MenuItemFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
  loading?: boolean;
};

export function MenuItemForm({ form, onSubmit, onCancel, submitLabel, loading = false }: MenuItemFormProps) {
  const { t } = useLocale();

  return (
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item
        label={t("menu.form.name")}
        name="name"
        rules={[{ required: true, message: t("menu.form.name") }]}
      >
        <Input placeholder={t("menu.form.namePlaceholder")} />
      </Form.Item>
      <Form.Item label={t("menu.form.description")} name="description">
        <Input.TextArea rows={3} placeholder={t("menu.form.descriptionPlaceholder")} />
      </Form.Item>
      <Form.Item
        label={t("menu.form.category")}
        name="category"
        rules={[{ required: true, message: t("menu.form.category") }]}
      >
        <Select
          options={menuCategories.map((category) => ({
            value: category.value,
            label: t(category.labelKey),
          }))}
        />
      </Form.Item>
      <Form.Item
        label={t("menu.form.price")}
        name="price"
        rules={[{ required: true, message: t("menu.form.price") }]}
      >
        <InputNumber min={0} style={{ width: "100%" }} addonAfter="VND" />
      </Form.Item>
      <Form.Item label={t("menu.form.available")} name="available" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Space style={{ width: "100%", justifyContent: "flex-end" }}>
        <Button onClick={onCancel}>{t("menu.form.cancel")}</Button>
        <Button type="primary" htmlType="submit" loading={loading}>
          {submitLabel}
        </Button>
      </Space>
    </Form>
  );
}
