"use client";

import Image from "next/image";
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { MenuItemForm, type MenuItemFormValues } from "@/features/menu/components/MenuItemForm";
import { menuCategories } from "@/features/menu/constants";
import { useMenuItems } from "@/features/menu/hooks/useMenuItems";
import { useTopicCombobox } from "@/features/menu/hooks/useTopicCombobox";
import type { MenuItem } from "@/features/menu/types";
import { useLocale } from "@/hooks/useLocale";
import { useHasHydrated } from "@/hooks/useHasHydrated";

const { Title, Text, Paragraph } = Typography;

export default function MenuManagementPage() {
  const {
    items,
    loading,
    error,
    action,
    pendingId,
    createItem,
    updateItem,
    deleteItem,
    toggleAvailability,
    searchItems,
    searchMeta,
  } = useMenuItems({ autoFetch: false });
  const { topics, loading: topicsLoading } = useTopicCombobox();
  const { t, locale } = useLocale();
  const [form] = Form.useForm<MenuItemFormValues>();
  const hydrated = useHasHydrated();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const totalItems = searchMeta?.totalItems ?? items.length;
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

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: t("menu.filters.all") },
      ...menuCategories.map((category) => ({ value: category.value, label: t(category.labelKey) })),
    ],
    [t],
  );

  const availabilityOptions = useMemo(
    () => [
      { label: t("menu.filters.all"), value: "all" },
      { label: t("menu.available"), value: "available" },
      { label: t("menu.unavailable"), value: "unavailable" },
    ],
    [t],
  );

  const normalizedFilter = searchTerm.trim();
  const activeCategory = categoryFilter === "all" ? undefined : categoryFilter;
  const activeStatus =
    availabilityFilter === "all" ? undefined : availabilityFilter === "available";

  useEffect(() => {
    const handler = setTimeout(() => {
      void searchItems({
        filter: normalizedFilter || undefined,
        category: activeCategory,
        isActive: activeStatus,
        limit: pageSize,
        page: Math.max(0, page - 1),
      });
    }, 300);
    return () => clearTimeout(handler);
  }, [activeCategory, activeStatus, normalizedFilter, page, pageSize, searchItems]);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      name: "",
      sku: "",
      description: "",
      category: menuCategories[0]?.value ?? "other",
      price: 0,
      topicId: null,
      available: true,
      imageUrl: "",
    });
    setOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      name: t(item.name),
      sku: item.sku ?? "",
      description: item.description ? t(item.description) : "",
      category: item.category,
      price: item.price,
      topicId: item.topicId ?? null,
      available: item.available,
      imageUrl: item.imageUrl ?? "",
    });
    setOpen(true);
  };

  const handleSubmit = async (values: MenuItemFormValues) => {
    const sku = typeof values.sku === "string" ? values.sku.trim() : "";
    const topicId =
      typeof values.topicId === "number" && Number.isFinite(values.topicId) ? values.topicId : null;
    const normalizedValues = {
      ...values,
      sku,
      topicId,
    };
    if (editingItem) {
      const nextValues = { ...normalizedValues };
      if (t(editingItem.name) === values.name) {
        nextValues.name = editingItem.name;
      }
      if (editingItem.description) {
        const translatedDescription = t(editingItem.description);
        if (values.description === translatedDescription) {
          nextValues.description = editingItem.description;
        }
      }
      await updateItem(editingItem.id, nextValues);
    } else {
      await createItem(normalizedValues);
    }
    setOpen(false);
  };

  const columns: ColumnsType<MenuItem> = [
    {
      title: t("menu.table.image"),
      dataIndex: "imageUrl",
      key: "imageUrl",
      width: 96,
      responsive: ["sm"],
      render: (value: string | undefined, record: MenuItem) => (
        <div className="menu-item-thumb">
          {value ? (
            <Image src={value} alt={t(record.name)} width={56} height={56} />
          ) : (
            <span>QR</span>
          )}
        </div>
      ),
    },
    {
      title: t("menu.table.name"),
      dataIndex: "name",
      key: "name",
      render: (_: string, record: MenuItem) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{t(record.name)}</Text>
          {record.description && <Text type="secondary">{t(record.description)}</Text>}
        </Space>
      ),
    },
    {
      title: t("menu.table.category"),
      dataIndex: "category",
      key: "category",
      responsive: ["md"],
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
        <Space size="small">
          <Switch
            checked={value}
            onChange={(checked) => toggleAvailability(record.id, checked)}
            loading={action === "toggle" && pendingId === record.id}
          />
          <Text type={value ? "success" : "secondary"}>
            {value ? t("menu.available") : t("menu.unavailable")}
          </Text>
        </Space>
      ),
    },
    {
      title: t("menu.table.updated"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      responsive: ["lg"],
      render: (value: string) =>
        hydrated ? new Date(value).toLocaleString(locale === "vi" ? "vi-VN" : "en-US") : "—",
    },
    {
      title: t("menu.table.actions"),
      key: "actions",
      render: (_: string, record: MenuItem) => (
        <Space className="menu-admin-actions">
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
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
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
          <div className="menu-admin-toolbar">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12} lg={10}>
                <div className="menu-admin-field">
                  <Text type="secondary">{t("menu.search.label")}</Text>
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder={t("menu.search.placeholder")}
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={6} lg={6}>
                <div className="menu-admin-field">
                  <Text type="secondary">{t("menu.form.category")}</Text>
                  <Select
                    value={categoryFilter}
                    onChange={(value) => {
                      setCategoryFilter(value);
                      setPage(1);
                    }}
                    options={categoryOptions}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={6} lg={8}>
                <div className="menu-admin-field">
                  <Text type="secondary">{t("menu.table.available")}</Text>
                  <Segmented
                    value={availabilityFilter}
                    onChange={(value) => {
                      setAvailabilityFilter(value as "all" | "available" | "unavailable");
                      setPage(1);
                    }}
                    options={availabilityOptions}
                  />
                </div>
              </Col>
            </Row>
          </div>
          <Text type="secondary" className="menu-admin-results">
            {totalItems} {t("menu.itemsLabel")}
          </Text>
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
          pagination={{
            current: page,
            pageSize,
            total: totalItems,
            size: "small",
            showSizeChanger: false,
            onChange: (nextPage) => setPage(nextPage),
          }}
          size="small"
          className="glass-table"
        />
      </Card>
      {hydrated ? (
        <Modal
          open={open}
          title={editingItem ? t("menu.actions.edit") : t("menu.actions.add")}
          onCancel={() => setOpen(false)}
          footer={null}
          forceRender
          getContainer={false}
        >
          <MenuItemForm
            form={form}
            onCancelAction={() => setOpen(false)}
            onSubmitAction={handleSubmit}
            submitLabel={editingItem ? t("menu.actions.save") : t("menu.actions.create")}
            loading={action === "create" || action === "update"}
            topics={topics}
            topicsLoading={topicsLoading}
          />
        </Modal>
      ) : null}
    </Space>
  );
}
