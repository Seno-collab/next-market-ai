"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  TagsOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
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
  Spin,
  Pagination,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { MenuItemForm, type MenuItemFormValues } from "@/features/menu/components/MenuItemForm";
import { HolographicButton } from "@/features/menu/components/HolographicButton";
import { Table3DEffect } from "@/features/menu/components/Table3DEffect";
import { MetricCard3D } from "@/features/menu/components/MetricCard3D";
import { menuCategories } from "@/features/menu/constants";
import { useMenuItems } from "@/features/menu/hooks/useMenuItems";
import type { MenuItem } from "@/features/menu/types";
import { useLocale } from "@/hooks/useLocale";
import { useHasHydrated } from "@/hooks/useHasHydrated";

const { Title, Text } = Typography;

// Dynamic import for Three.js components (no SSR)
const MenuHeroScene = dynamic(
  () => import("@/features/menu/components/MenuHeroScene"),
  { ssr: false, loading: () => <div className="menu-hero-loading"><Spin size="large" /></div> }
);

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

  const effectiveLimit = searchMeta?.limit && searchMeta.limit > 0 ? searchMeta.limit : pageSize;
  const metaTotalPages = searchMeta?.totalPages ?? null;
  const totalItems = searchMeta?.totalItems ?? items.length;
  const totalPages =
    typeof metaTotalPages === "number" && metaTotalPages > 0
      ? metaTotalPages
      : Math.max(1, Math.ceil(totalItems / effectiveLimit));
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
      available: item.available,
      imageUrl: item.imageUrl ?? "",
    });
    setOpen(true);
  };

  const handleSubmit = async (values: MenuItemFormValues) => {
    const sku = typeof values.sku === "string" ? values.sku.trim() : "";
    const normalizedValues = {
      ...values,
      sku,
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
      width: 80,
      responsive: ["sm"],
      render: (value: string | undefined, record: MenuItem) => (
        <div className="menu-item-thumb-3d">
          {value ? (
            <Image src={value} alt={t(record.name)} width={56} height={56} />
          ) : (
            <div className="menu-item-thumb-placeholder">
              <AppstoreOutlined />
            </div>
          )}
        </div>
      ),
    },
    {
      title: t("menu.table.name"),
      dataIndex: "name",
      key: "name",
      render: (_: string, record: MenuItem) => (
        <div className="menu-item-info">
          <Text strong className="menu-item-name">{t(record.name)}</Text>
          {record.description && (
            <Text type="secondary" className="menu-item-desc">{t(record.description)}</Text>
          )}
        </div>
      ),
    },
    {
      title: t("menu.table.category"),
      dataIndex: "category",
      key: "category",
      responsive: ["md"],
      render: (value: string) => (
        <Tag className="menu-category-tag">{categoryLabel(value)}</Tag>
      ),
    },
    {
      title: t("menu.table.price"),
      dataIndex: "price",
      key: "price",
      render: (value: number) => (
        <Text className="menu-price-text">{formatter.format(value)}</Text>
      ),
    },
    {
      title: t("menu.table.available"),
      dataIndex: "available",
      key: "available",
      render: (value: boolean, record: MenuItem) => (
        <div className="menu-availability-cell">
          <Switch
            checked={value}
            onChange={(checked) => toggleAvailability(record.id, checked)}
            loading={action === "toggle" && pendingId === record.id}
            className="menu-availability-switch"
          />
          <span className={`menu-availability-text ${value ? "is-available" : ""}`}>
            {value ? t("menu.available") : t("menu.unavailable")}
          </span>
        </div>
      ),
    },
    {
      title: t("menu.table.updated"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      responsive: ["lg"],
      render: (value: string) => (
        <Text className="menu-date-text">
          {hydrated ? new Date(value).toLocaleString(locale === "vi" ? "vi-VN" : "en-US") : "—"}
        </Text>
      ),
    },
    {
      title: t("menu.table.actions"),
      key: "actions",
      width: 200,
      render: (_: string, record: MenuItem) => (
        <Space className="menu-admin-actions menu-3d-actions">
          <Button
            type="default"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
            className="holographic-action-btn holographic-action-btn--default"
          >
            {t("menu.actions.edit")}
          </Button>
          <Popconfirm
            title={t("menu.actions.confirmDelete")}
            okText={t("menu.actions.delete")}
            cancelText={t("menu.form.cancel")}
            onConfirm={() => deleteItem(record.id)}
          >
            <Button
              type="default"
              danger
              icon={<DeleteOutlined />}
              className="holographic-action-btn holographic-action-btn--danger"
            >
              {t("menu.actions.delete")}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="menu-management-shell">
      {/* Immersive 3D Hero Section */}
      <section className="menu-hero-section">
        <MenuHeroScene />
        <div className="menu-hero-overlay">
          <div className="menu-hero-content">
            <div className="menu-hero-badge">
              <AppstoreOutlined />
              <span>{t("menu.title") || "Menu Management"}</span>
            </div>
            <h1 className="menu-hero-title">
              {t("menu.subtitle") || "Manage Your Menu"}
            </h1>
            <p className="menu-hero-description">
              Create, edit, and organize your catalog with powerful tools and real-time updates
            </p>
            <div className="menu-hero-actions">
              <HolographicButton variant="primary" icon={<PlusOutlined />} onClick={openCreate}>
                {t("menu.actions.add")}
              </HolographicButton>
            </div>
          </div>
        </div>
        <div className="menu-hero-gradient" />
      </section>

      {/* Metrics Section */}
      <section className="menu-metrics-section">
        <Row gutter={[20, 20]}>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard3D
              icon={<DatabaseOutlined />}
              label={t("menu.metrics.totalItems") || "Total Items"}
              value={totalItems}
              variant="cyan"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard3D
              icon={<CheckCircleOutlined />}
              label={t("analytics.availableItems") || "Available"}
              value={availableItems}
              variant="green"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard3D
              icon={<TagsOutlined />}
              label={t("menu.metrics.categories") || "Categories"}
              value={categoryCount}
              variant="purple"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <MetricCard3D
              icon={<AppstoreOutlined />}
              label={t("analytics.totalPages") || "Pages"}
              value={totalPages}
              variant="orange"
            />
          </Col>
        </Row>
      </section>

      {/* Filter & Search Section */}
      <section className="menu-filter-section">
        <Card className="menu-filter-card glass-card-enhanced">
          <div className="menu-filter-header">
            <div className="menu-filter-title-group">
              <Title level={4} className="menu-filter-title">
                <SearchOutlined /> {t("menu.search.label") || "Search & Filter"}
              </Title>
              <Text type="secondary" className="menu-filter-results">
                {totalItems} {t("menu.itemsFound") || "items found"}
              </Text>
            </div>
          </div>
          <div className="menu-filter-controls">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={10} lg={8}>
                <div className="menu-filter-field">
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder={t("menu.search.placeholder") || "Search menu items..."}
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setPage(1);
                    }}
                    className="menu-search-input"
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={7} lg={6}>
                <div className="menu-filter-field">
                  <Select
                    value={categoryFilter}
                    onChange={(value) => {
                      setCategoryFilter(value);
                      setPage(1);
                    }}
                    options={categoryOptions}
                    className="menu-category-select"
                    placeholder={t("menu.form.category")}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={7} lg={10}>
                <div className="menu-filter-field">
                  <Segmented
                    name="admin-menu-availability-toggle"
                    value={availabilityFilter}
                    onChange={(value) => {
                      setAvailabilityFilter(value as "all" | "available" | "unavailable");
                      setPage(1);
                    }}
                    options={availabilityOptions}
                    className="menu-availability-segmented"
                  />
                </div>
              </Col>
            </Row>
          </div>
        </Card>
      </section>

      {/* Table Section */}
      <section className="menu-table-section">
        <Card className="menu-table-card-enhanced glass-card-enhanced">
          {error && (
            <div className="menu-error-banner">
              <Text type="danger">{error}</Text>
            </div>
          )}
          <Table3DEffect className="menu-table-3d-enhanced">
            <Table
              rowKey="id"
              loading={loading || action === "fetch"}
              columns={columns}
              dataSource={items}
              pagination={false}
              size="middle"
              className="menu-data-table"
              rowClassName="menu-table-row"
            />
          </Table3DEffect>
          <div className="menu-pagination-wrapper">
            <Pagination
              current={page}
              total={totalPages}
              pageSize={1}
              showSizeChanger={false}
              onChange={(nextPage) => setPage(nextPage)}
              className="menu-pagination"
            />
          </div>
        </Card>
      </section>

      {/* Modal */}
      {hydrated ? (
        <Modal
          open={open}
          title={
            <div className="menu-modal-title">
              {editingItem ? (
                <><EditOutlined /> {t("menu.actions.edit")}</>
              ) : (
                <><PlusOutlined /> {t("menu.actions.add")}</>
              )}
            </div>
          }
          onCancel={() => setOpen(false)}
          footer={null}
          forceRender
          getContainer={false}
          className="menu-modal-enhanced"
          width={600}
        >
          <MenuItemForm
            form={form}
            onCancelAction={() => setOpen(false)}
            onSubmitAction={handleSubmit}
            submitLabel={editingItem ? t("menu.actions.save") : t("menu.actions.create")}
            loading={action === "create" || action === "update"}
          />
        </Modal>
      ) : null}
    </div>
  );
}
