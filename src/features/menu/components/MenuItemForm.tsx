"use client";

import Image from "next/image";
import { UploadOutlined } from "@ant-design/icons";
import { Button, Form, Input, InputNumber, Select, Space, Switch, Typography } from "antd";
import type { FormInstance } from "antd";
import { useEffect, useRef, useState } from "react";
import { menuCategories } from "@/features/menu/constants";
import { useLocale } from "@/hooks/useLocale";
import { fetchJson, notifyError } from "@/lib/api/client";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function sanitizeImageUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return encodeURI(trimmed).replace(/#/g, "%23");
}

export type MenuItemFormValues = {
  name: string;
  sku?: string;
  description?: string;
  category: string;
  price: number;
  available: boolean;
  imageUrl?: string;
};

type MenuItemFormProps = {
  form: FormInstance<MenuItemFormValues>;
  onSubmitAction: (values: MenuItemFormValues) => void | Promise<void>;
  onCancelAction: () => void;
  submitLabel: string;
  loading?: boolean;
};

export function MenuItemForm({
  form,
  onSubmitAction,
  onCancelAction,
  submitLabel,
  loading = false,
}: MenuItemFormProps) {
  const { t } = useLocale();
  const { Text } = Typography;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(
    null
  );
  const imageUrl = Form.useWatch("imageUrl", form);
  const trimmedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const previewImageUrl = pendingPreviewUrl
    ? pendingPreviewUrl
    : trimmedImageUrl
    ? sanitizeImageUrl(trimmedImageUrl)
    : "";
  const isSubmitting = loading || uploading;

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(pendingFile);
    setPendingPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
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
    if (file.size > MAX_IMAGE_BYTES) {
      notifyError(t("menu.errors.uploadTooLarge"));
      event.target.value = "";
      return;
    }
    setPendingFile(file);
    form.setFieldsValue({ imageUrl: "" });
    event.target.value = "";
  };

  const handleRemoveImage = () => {
    setPendingFile(null);
    form.setFieldsValue({ imageUrl: "" });
  };

  const handleFinish = async (values: MenuItemFormValues) => {
    let nextImageUrl =
      typeof values.imageUrl === "string" ? values.imageUrl.trim() : "";
    if (pendingFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", pendingFile);
        const response = await fetchJson<{ url: string }>("/api/menu/upload", {
          method: "POST",
          body: formData,
        });
        nextImageUrl = sanitizeImageUrl(response.url);
        setPendingFile(null);
        form.setFieldsValue({ imageUrl: nextImageUrl });
      } catch {
        // Error toast is already handled by fetchJson.
        return;
      } finally {
        setUploading(false);
      }
    }
    const normalizedImageUrl = nextImageUrl
      ? sanitizeImageUrl(nextImageUrl)
      : undefined;
    await Promise.resolve(
      onSubmitAction({ ...values, imageUrl: normalizedImageUrl })
    );
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}>
      <Form.Item
        label={t("menu.form.name")}
        name="name"
        rules={[{ required: true, message: t("menu.form.name") }]}
      >
        <Input placeholder={t("menu.form.namePlaceholder")} />
      </Form.Item>
      <Form.Item label={t("menu.form.sku")} name="sku">
        <Input placeholder={t("menu.form.skuPlaceholder")} />
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
        <Space.Compact style={{ width: "100%" }}>
          <InputNumber min={0} style={{ width: "100%" }} />
          <div className="menu-price-addon">VND</div>
        </Space.Compact>
      </Form.Item>
      <Form.Item name="imageUrl" hidden>
        <Input type="hidden" />
      </Form.Item>
      <div className="menu-image-actions">
        <div className="menu-image-actions__header">
          <Text strong>{t("menu.form.image")}</Text>
          <Text type="secondary" className="menu-image-actions__hint">
            {t("menu.form.imagePlaceholder")}
          </Text>
        </div>
        <Space size="small" wrap className="menu-image-actions__buttons">
          <Button
            icon={<UploadOutlined />}
            onClick={handlePickFile}
            loading={uploading}
            disabled={loading || uploading}
          >
            {t("menu.form.imageUpload")}
          </Button>
          <Button
            onClick={handleRemoveImage}
            disabled={(!trimmedImageUrl && !pendingFile) || isSubmitting}
          >
            {t("menu.form.imageRemove")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileChange}
          />
        </Space>
        {previewImageUrl && (
          <div className="menu-image-preview">
            <Image
              src={previewImageUrl}
              alt={t("menu.form.image")}
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              unoptimized={Boolean(pendingFile)}
            />
          </div>
        )}
      </div>
      <Form.Item label={t("menu.form.available")} name="available" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Space style={{ width: "100%", justifyContent: "flex-end" }}>
        <Button onClick={onCancelAction}>{t("menu.form.cancel")}</Button>
        <Button
          type="primary"
          htmlType="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {submitLabel}
        </Button>
      </Space>
    </Form>
  );
}
