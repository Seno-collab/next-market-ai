"use client";

import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";
import type { OptionGroup, OptionItem, Topic } from "@/features/menu/types";
import { useTopics } from "@/features/menu/hooks/useTopics";
import { useOptionGroups } from "@/features/menu/hooks/useOptionGroups";
import { useOptionItems } from "@/features/menu/hooks/useOptionItems";
import { useLocale } from "@/hooks/useLocale";

const { Title, Text, Paragraph } = Typography;

type TopicFormValues = {
  name: string;
  slug?: string;
  parent_id?: number | null;
  sort_order?: number | null;
};

type OptionGroupFormValues = {
  name: string;
  menu_item_id: number;
  min_select?: number | null;
  max_select?: number | null;
  is_required?: boolean;
  sort_order?: number | null;
};

type OptionItemFormValues = {
  name: string;
  option_group_id: number;
  price_delta?: number | null;
  quantity_min?: number | null;
  quantity_max?: number | null;
  sort_order?: number | null;
  linked_menu_item?: number | null;
  is_active?: boolean;
};

export default function TopicsPage() {
  const { t } = useLocale();
  const { topics, loading: topicsLoading, error: topicsError, action: topicAction, fetchTopics, createTopic, updateTopic, deleteTopic } =
    useTopics();
  const {
    groups,
    loading: groupsLoading,
    error: groupsError,
    action: groupAction,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
  } = useOptionGroups();
  const {
    items,
    loading: itemsLoading,
    error: itemsError,
    action: itemAction,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  } = useOptionItems();

  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [menuItemId, setMenuItemId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);

  const [topicForm] = Form.useForm<TopicFormValues>();
  const [groupForm] = Form.useForm<OptionGroupFormValues>();
  const [itemForm] = Form.useForm<OptionItemFormValues>();

  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);

  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);
  const [editingItem, setEditingItem] = useState<OptionItem | null>(null);

  const openTopicCreate = () => {
    setEditingTopic(null);
    topicForm.resetFields();
    setTopicModalOpen(true);
  };

  const openTopicEdit = (topic: Topic) => {
    setEditingTopic(topic);
    topicForm.setFieldsValue({
      name: topic.name,
      slug: topic.slug ?? "",
      parent_id: topic.parent_id ?? null,
      sort_order: topic.sort_order ?? null,
    });
    setTopicModalOpen(true);
  };

  const handleTopicSubmit = async (values: TopicFormValues) => {
    const payload = {
      ...values,
      name: values.name.trim(),
      slug: values.slug?.trim() || undefined,
    };
    if (editingTopic) {
      await updateTopic(editingTopic.id, payload);
    } else {
      await createTopic(payload);
    }
    setTopicModalOpen(false);
    if (restaurantId) {
      await fetchTopics(restaurantId);
    }
  };

  const openGroupCreate = () => {
    setEditingGroup(null);
    groupForm.resetFields();
    groupForm.setFieldsValue({
      menu_item_id: menuItemId ?? undefined,
      is_required: true,
    });
    setGroupModalOpen(true);
  };

  const openGroupEdit = (group: OptionGroup) => {
    setEditingGroup(group);
    groupForm.setFieldsValue({
      name: group.name,
      menu_item_id: group.menu_item_id ?? menuItemId ?? undefined,
      min_select: group.min_select ?? null,
      max_select: group.max_select ?? null,
      is_required: group.is_required ?? false,
      sort_order: group.sort_order ?? null,
    });
    setGroupModalOpen(true);
  };

  const handleGroupSubmit = async (values: OptionGroupFormValues) => {
    const payload = {
      ...values,
      name: values.name.trim(),
    };
    if (editingGroup) {
      const { menu_item_id, ...rest } = payload;
      await updateGroup(editingGroup.id, rest);
    } else {
      await createGroup(payload);
    }
    setGroupModalOpen(false);
    if (menuItemId) {
      await fetchGroups(menuItemId);
    }
  };

  const openItemCreate = () => {
    setEditingItem(null);
    itemForm.resetFields();
    itemForm.setFieldsValue({
      option_group_id: groupId ?? undefined,
      is_active: true,
    });
    setItemModalOpen(true);
  };

  const openItemEdit = (item: OptionItem) => {
    setEditingItem(item);
    itemForm.setFieldsValue({
      name: item.name,
      option_group_id: item.option_group_id ?? groupId ?? undefined,
      price_delta: item.price_delta ?? null,
      quantity_min: item.quantity_min ?? null,
      quantity_max: item.quantity_max ?? null,
      sort_order: item.sort_order ?? null,
      linked_menu_item: item.linked_menu_item ?? null,
      is_active: item.is_active ?? false,
    });
    setItemModalOpen(true);
  };

  const handleItemSubmit = async (values: OptionItemFormValues) => {
    const payload = {
      ...values,
      name: values.name.trim(),
    };
    if (editingItem) {
      const { option_group_id, is_active, ...rest } = payload;
      await updateItem(editingItem.id, rest);
    } else {
      await createItem(payload);
    }
    setItemModalOpen(false);
    if (groupId) {
      await fetchItems(groupId);
    }
  };

  const topicColumns = [
    {
      title: t("topics.table.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("topics.table.slug"),
      dataIndex: "slug",
      key: "slug",
      render: (value?: string) => value || <Text type="secondary">—</Text>,
    },
    {
      title: t("topics.table.parent"),
      dataIndex: "parent_id",
      key: "parent_id",
      render: (value?: number) => (value ? <Tag>{value}</Tag> : <Text type="secondary">—</Text>),
    },
    {
      title: t("topics.table.sort"),
      dataIndex: "sort_order",
      key: "sort_order",
      render: (value?: number) => (value ?? <Text type="secondary">—</Text>),
    },
    {
      title: t("topics.table.id"),
      dataIndex: "id",
      key: "id",
      width: 100,
    },
    {
      title: t("topics.table.actions"),
      key: "actions",
      render: (_: unknown, record: Topic) => (
        <Space className="menu-admin-actions">
          <Button icon={<EditOutlined />} onClick={() => openTopicEdit(record)}>
            {t("menu.actions.edit")}
          </Button>
            <Popconfirm
              title={t("menu.actions.confirmDelete")}
              okText={t("menu.actions.delete")}
              cancelText={t("menu.form.cancel")}
              onConfirm={async () => {
                await deleteTopic(record.id);
                if (restaurantId) {
                  await fetchTopics(restaurantId);
                }
              }}
            >
            <Button danger icon={<DeleteOutlined />}>
              {t("menu.actions.delete")}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const groupColumns = [
    {
      title: t("variants.groups.table.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("variants.groups.table.required"),
      dataIndex: "is_required",
      key: "is_required",
      render: (value?: boolean) =>
        value ? <Tag color="green">{t("variants.groups.required")}</Tag> : <Tag>{t("variants.groups.optional")}</Tag>,
    },
    {
      title: t("variants.groups.table.range"),
      key: "range",
      render: (_: unknown, record: OptionGroup) => (
        <Text>
          {record.min_select ?? 0} - {record.max_select ?? 0}
        </Text>
      ),
    },
    {
      title: t("variants.groups.table.sort"),
      dataIndex: "sort_order",
      key: "sort_order",
      render: (value?: number) => (value ?? <Text type="secondary">—</Text>),
    },
    {
      title: t("variants.groups.table.id"),
      dataIndex: "id",
      key: "id",
      width: 100,
    },
    {
      title: t("variants.groups.table.actions"),
      key: "actions",
      render: (_: unknown, record: OptionGroup) => (
        <Space className="menu-admin-actions">
          <Button icon={<EditOutlined />} onClick={() => openGroupEdit(record)}>
            {t("menu.actions.edit")}
          </Button>
          <Popconfirm
            title={t("menu.actions.confirmDelete")}
            okText={t("menu.actions.delete")}
            cancelText={t("menu.form.cancel")}
            onConfirm={async () => {
              await deleteGroup(record.id);
              if (menuItemId) {
                await fetchGroups(menuItemId);
              }
            }}
          >
            <Button danger icon={<DeleteOutlined />}>
              {t("menu.actions.delete")}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const itemColumns = [
    {
      title: t("variants.items.table.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("variants.items.table.priceDelta"),
      dataIndex: "price_delta",
      key: "price_delta",
      render: (value?: number) => (value ?? <Text type="secondary">—</Text>),
    },
    {
      title: t("variants.items.table.qty"),
      key: "qty",
      render: (_: unknown, record: OptionItem) => (
        <Text>
          {record.quantity_min ?? 0} - {record.quantity_max ?? 0}
        </Text>
      ),
    },
    {
      title: t("variants.items.table.active"),
      dataIndex: "is_active",
      key: "is_active",
      render: (value?: boolean) =>
        value ? <Tag color="green">{t("variants.items.active")}</Tag> : <Tag>{t("variants.items.inactive")}</Tag>,
    },
    {
      title: t("variants.items.table.id"),
      dataIndex: "id",
      key: "id",
      width: 100,
    },
    {
      title: t("variants.items.table.actions"),
      key: "actions",
      render: (_: unknown, record: OptionItem) => (
        <Space className="menu-admin-actions">
          <Button icon={<EditOutlined />} onClick={() => openItemEdit(record)}>
            {t("menu.actions.edit")}
          </Button>
          <Popconfirm
            title={t("menu.actions.confirmDelete")}
            okText={t("menu.actions.delete")}
            cancelText={t("menu.form.cancel")}
            onConfirm={async () => {
              await deleteItem(record.id);
              if (groupId) {
                await fetchItems(groupId);
              }
            }}
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
          <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {t("topics.title")}
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                {t("topics.subtitle")}
              </Paragraph>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={openTopicCreate}>
              {t("menu.actions.add")}
            </Button>
          </Space>
          <div className="menu-admin-toolbar">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <div className="menu-admin-field">
                  <Text type="secondary">{t("topics.restaurantId")}</Text>
                  <InputNumber
                    min={1}
                    value={restaurantId ?? undefined}
                    onChange={(value) => setRestaurantId(value ?? null)}
                    placeholder="123"
                    style={{ width: "100%" }}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => restaurantId && fetchTopics(restaurantId)}
                  loading={topicAction === "fetch"}
                  disabled={!restaurantId}
                >
                  {t("topics.load")}
                </Button>
              </Col>
            </Row>
          </div>
          {topicsError && <Text type="danger">{topicsError}</Text>}
          <Table
            rowKey="id"
            loading={topicsLoading}
            columns={topicColumns}
            dataSource={topics}
            pagination={{ pageSize: 6, size: "small", showSizeChanger: false }}
            className="glass-table"
          />
        </Space>
      </Card>

      <Card variant="borderless" className="glass-card">
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {t("variants.groups.title")}
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                {t("variants.groups.subtitle")}
              </Paragraph>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={openGroupCreate}>
              {t("menu.actions.add")}
            </Button>
          </Space>
          <div className="menu-admin-toolbar">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <div className="menu-admin-field">
                  <Text type="secondary">{t("variants.groups.menuItemId")}</Text>
                  <InputNumber
                    min={1}
                    value={menuItemId ?? undefined}
                    onChange={(value) => setMenuItemId(value ?? null)}
                    placeholder="101"
                    style={{ width: "100%" }}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => menuItemId && fetchGroups(menuItemId)}
                  loading={groupAction === "fetch"}
                  disabled={!menuItemId}
                >
                  {t("variants.groups.load")}
                </Button>
              </Col>
            </Row>
          </div>
          {groupsError && <Text type="danger">{groupsError}</Text>}
          <Table
            rowKey="id"
            loading={groupsLoading}
            columns={groupColumns}
            dataSource={groups}
            pagination={{ pageSize: 6, size: "small", showSizeChanger: false }}
            className="glass-table"
          />
        </Space>
      </Card>

      <Card variant="borderless" className="glass-card">
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {t("variants.items.title")}
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                {t("variants.items.subtitle")}
              </Paragraph>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={openItemCreate}>
              {t("menu.actions.add")}
            </Button>
          </Space>
          <div className="menu-admin-toolbar">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <div className="menu-admin-field">
                  <Text type="secondary">{t("variants.items.groupId")}</Text>
                  <InputNumber
                    min={1}
                    value={groupId ?? undefined}
                    onChange={(value) => setGroupId(value ?? null)}
                    placeholder="12"
                    style={{ width: "100%" }}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => groupId && fetchItems(groupId)}
                  loading={itemAction === "fetch"}
                  disabled={!groupId}
                >
                  {t("variants.items.load")}
                </Button>
              </Col>
            </Row>
          </div>
          {itemsError && <Text type="danger">{itemsError}</Text>}
          <Table
            rowKey="id"
            loading={itemsLoading}
            columns={itemColumns}
            dataSource={items}
            pagination={{ pageSize: 6, size: "small", showSizeChanger: false }}
            className="glass-table"
          />
        </Space>
      </Card>

      <Modal
        open={topicModalOpen}
        title={editingTopic ? t("menu.actions.edit") : t("menu.actions.add")}
        onCancel={() => setTopicModalOpen(false)}
        footer={null}
        forceRender
      >
        <Form form={topicForm} layout="vertical" onFinish={handleTopicSubmit}>
          <Form.Item label={t("topics.form.name")} name="name" rules={[{ required: true, message: t("topics.form.name") }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t("topics.form.slug")} name="slug">
            <Input />
          </Form.Item>
          <Form.Item label={t("topics.form.parent")} name="parent_id">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label={t("topics.form.sort")} name="sort_order">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={() => setTopicModalOpen(false)}>{t("menu.form.cancel")}</Button>
            <Button type="primary" htmlType="submit" loading={topicAction === "create" || topicAction === "update"}>
              {editingTopic ? t("menu.actions.save") : t("menu.actions.create")}
            </Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        open={groupModalOpen}
        title={editingGroup ? t("menu.actions.edit") : t("menu.actions.add")}
        onCancel={() => setGroupModalOpen(false)}
        footer={null}
        forceRender
      >
        <Form form={groupForm} layout="vertical" onFinish={handleGroupSubmit}>
          <Form.Item
            label={t("variants.groups.form.name")}
            name="name"
            rules={[{ required: true, message: t("variants.groups.form.name") }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t("variants.groups.form.menuItemId")}
            name="menu_item_id"
            rules={[{ required: true, message: t("variants.groups.form.menuItemId") }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} disabled={Boolean(editingGroup)} />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={12}>
              <Form.Item label={t("variants.groups.form.minSelect")} name="min_select">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item label={t("variants.groups.form.maxSelect")} name="max_select">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={t("variants.groups.form.required")} name="is_required" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label={t("variants.groups.form.sortOrder")} name="sort_order">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={() => setGroupModalOpen(false)}>{t("menu.form.cancel")}</Button>
            <Button type="primary" htmlType="submit" loading={groupAction === "create" || groupAction === "update"}>
              {editingGroup ? t("menu.actions.save") : t("menu.actions.create")}
            </Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        open={itemModalOpen}
        title={editingItem ? t("menu.actions.edit") : t("menu.actions.add")}
        onCancel={() => setItemModalOpen(false)}
        footer={null}
        forceRender
      >
        <Form form={itemForm} layout="vertical" onFinish={handleItemSubmit}>
          <Form.Item
            label={t("variants.items.form.name")}
            name="name"
            rules={[{ required: true, message: t("variants.items.form.name") }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t("variants.items.form.groupId")}
            name="option_group_id"
            rules={[{ required: true, message: t("variants.items.form.groupId") }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} disabled={Boolean(editingItem)} />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={12}>
              <Form.Item label={t("variants.items.form.priceDelta")} name="price_delta">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item label={t("variants.items.form.linkedMenuItem")} name="linked_menu_item">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col xs={12}>
              <Form.Item label={t("variants.items.form.qtyMin")} name="quantity_min">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item label={t("variants.items.form.qtyMax")} name="quantity_max">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={t("variants.items.form.sortOrder")} name="sort_order">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label={t("variants.items.form.active")} name="is_active" valuePropName="checked">
            <Switch disabled={Boolean(editingItem)} />
          </Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={() => setItemModalOpen(false)}>{t("menu.form.cancel")}</Button>
            <Button type="primary" htmlType="submit" loading={itemAction === "create" || itemAction === "update"}>
              {editingItem ? t("menu.actions.save") : t("menu.actions.create")}
            </Button>
          </Space>
        </Form>
      </Modal>
    </Space>
  );
}
