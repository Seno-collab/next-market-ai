"use client";

import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Form,
  Modal,
  Popconfirm,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import { MenuItemForm, type MenuItemFormValues } from "@/features/menu/components/MenuItemForm";
import { menuCategories } from "@/features/menu/constants";
import { useMenuItems } from "@/features/menu/hooks/useMenuItems";
import type { MenuItem } from "@/features/menu/types";
import { useLocale } from "@/hooks/useLocale";

const { Title, Text, Paragraph } = Typography;

export default function MenuManagementPage() {
  const { items, loading, error, action, pendingId, createItem, updateItem, deleteItem, toggleAvailability } =
    useMenuItems();
  const { t, locale } = useLocale();
  const [form] = Form.useForm<MenuItemFormValues>();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const totalItems = items.length;
  const availableItems = items.filter((item) => item.available).length;
  const categoryCount = new Set(items.map((item) => item.category)).size;

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const categoryLabel = (value: string) => {
    const category = menuCategories.find((item) => item.value === value);
    return category ? t(category.labelKey) : value;
  };

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      name: "",
      description: "",
      category: menuCategories[0]?.value ?? "other",
      price: 0,
      available: true,
    });
    setOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
      available: item.available,
    });
    setOpen(true);
  };

  const handleSubmit = async (values: MenuItemFormValues) => {
    if (editingItem) {
      await updateItem(editingItem.id, values);
    } else {
      await createItem(values);
    }
    setOpen(false);
  };

  const columns = [
    {
      title: t("menu.table.name"),
      dataIndex: "name",
      key: "name",
      render: (_: string, record: MenuItem) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.name}</Text>
          {record.description && <Text type="secondary">{record.description}</Text>}
        </Space>
      ),
    },
    {
      title: t("menu.table.category"),
      dataIndex: "category",
      key: "category",
      render: (value: string) => <Tag color="blue">{categoryLabel(value)}</Tag>,
    },
    {
      title: t("menu.table.price"),
      dataIndex: "price",
      key: "price",
      render: (value: number) => <Text>{formatter.format(value)}</Text>,
    },
    {
      title: t("menu.table.available"),
      dataIndex: "available",
      key: "available",
      render: (value: boolean, record: MenuItem) => (
        <Switch
          checked={value}
          onChange={(checked) => toggleAvailability(record.id, checked)}
          loading={action === "toggle" && pendingId === record.id}
        />
      ),
    },
    {
      title: t("menu.table.updated"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: t("menu.table.actions"),
      key: "actions",
      render: (_: string, record: MenuItem) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)}>
            {t("menu.actions.edit")}
          </Button>
          <Popconfirm
            title={t("menu.actions.confirmDelete")}
            okText={t("menu.actions.delete")}
            cancelText={t("menu.form.cancel")}
            onConfirm={() => deleteItem(record.id)}
          >
            <Button danger icon={<DeleteOutlined />}>
              {t("menu.actions.delete")}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Card variant="borderless" className="glass-card">
        <Space orientation="vertical" size={4}>
          <Title level={3} style={{ margin: 0 }}>
            {t("menu.title")}
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {t("menu.subtitle")}
          </Paragraph>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("menu.actions.add")}
          </Button>
        </Space>
      </Card>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card variant="borderless" className="glass-card metric-card">
            <Text type="secondary">{t("analytics.totalItems")}</Text>
            <Title level={3} style={{ margin: 0 }}>
              {totalItems}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless" className="glass-card metric-card">
            <Text type="secondary">{t("analytics.availableItems")}</Text>
            <Title level={3} style={{ margin: 0 }}>
              {availableItems}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless" className="glass-card metric-card">
            <Text type="secondary">{t("menu.metrics.categories")}</Text>
            <Title level={3} style={{ margin: 0 }}>
              {categoryCount}
            </Title>
          </Card>
        </Col>
      </Row>
      <Card variant="borderless" className="glass-card">
        {error && <Text type="danger">{error}</Text>}
        <Table
          rowKey="id"
          loading={loading || action === "fetch"}
          columns={columns}
          dataSource={items}
          pagination={{ pageSize: 6 }}
          className="glass-table"
        />
      </Card>
      <Modal
        open={open}
        title={editingItem ? t("menu.actions.edit") : t("menu.actions.add")}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <MenuItemForm
          form={form}
          onCancel={() => setOpen(false)}
          onSubmit={handleSubmit}
          submitLabel={editingItem ? t("menu.actions.save") : t("menu.actions.create")}
          loading={action === "create" || action === "update"}
        />
      </Modal>
    </Space>
  );
}
