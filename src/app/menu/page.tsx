"use client";

import { Button, Card, Col, Row, Space, Tag, Typography } from "antd";
import { useMemo, useState, type CSSProperties } from "react";
import { Playfair_Display, Space_Grotesk } from "next/font/google";
import { useMenuItems } from "@/features/menu/hooks/useMenuItems";
import { menuCategories } from "@/features/menu/constants";
import { useLocale } from "@/hooks/useLocale";

const { Title, Paragraph, Text } = Typography;

const displayFont = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });
const bodyFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-body" });

const accentMap: Record<string, string> = {
  coffee: "#f59e0b",
  tea: "#fb7185",
  dessert: "#f97316",
  food: "#facc15",
  other: "#fda4af",
};

export default function MenuPage() {
  const { items } = useMenuItems();
  const { t, locale } = useLocale();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const formatter = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

  const availableItems = items.filter((item) => item.available);
  const filteredItems =
    activeCategory === "all"
      ? availableItems
      : availableItems.filter((item) => item.category === activeCategory);
  const averagePrice =
    availableItems.length === 0
      ? 0
      : availableItems.reduce((sum, item) => sum + item.price, 0) / availableItems.length;

  const highlightItem = filteredItems[0] ?? availableItems[0] ?? null;

  const categoryLabel = (value: string) => {
    const category = menuCategories.find((item) => item.value === value);
    return category ? t(category.labelKey) : value;
  };

  const filterOptions = useMemo(
    () => [
      { value: "all", label: t("menu.filters.all") },
      ...menuCategories.map((category) => ({ value: category.value, label: t(category.labelKey) })),
    ],
    [t],
  );

  return (
    <div className={`menu-shell ${displayFont.variable} ${bodyFont.variable}`}>
      <div className="menu-backdrop" />
      <Space orientation="vertical" size="large" style={{ width: "100%" }} className="menu-content">
        <Card variant="borderless" className="menu-hero glass-card">
          <Row gutter={[32, 32]} align="middle">
            <Col xs={24} lg={14}>
              <Space orientation="vertical" size="middle">
                <Tag className="menu-badge">{t("menu.heroBadge")}</Tag>
                <Title level={1} className="menu-title" style={{ margin: 0 }}>
                  {t("menu.qrTitle")}
                </Title>
                <Paragraph className="menu-subtitle">{t("menu.qrSubtitle")}</Paragraph>
                <Space size="middle" wrap>
                  <Button type="primary" size="large" className="menu-primary">
                    {t("menu.heroPrimary")}
                  </Button>
                  <Button size="large" className="menu-secondary">
                    {t("menu.heroSecondary")}
                  </Button>
                </Space>
                <div className="menu-metrics">
                  <div>
                    <Text type="secondary">{t("analytics.totalItems")}</Text>
                    <Text className="menu-metric-value">{availableItems.length}</Text>
                  </div>
                  <div>
                    <Text type="secondary">{t("analytics.averagePrice")}</Text>
                    <Text className="menu-metric-value">{formatter.format(averagePrice)}</Text>
                  </div>
                </div>
              </Space>
            </Col>
            <Col xs={24} lg={10}>
              <div className="menu-spotlight">
                <div className="menu-spotlight-glow" />
                <Card variant="borderless" className="menu-spotlight-card">
                  <Text className="menu-spotlight-label">{t("menu.spotlightTitle")}</Text>
                  {highlightItem ? (
                    <Space orientation="vertical" size={4}>
                      <Text className="menu-spotlight-name">{highlightItem.name}</Text>
                      <Text type="secondary">{highlightItem.description}</Text>
                      <Text className="menu-spotlight-price">
                        {formatter.format(highlightItem.price)}
                      </Text>
                    </Space>
                  ) : (
                    <Text type="secondary">{t("menu.spotlightEmpty")}</Text>
                  )}
                </Card>
              </div>
            </Col>
          </Row>
        </Card>

        <div className="menu-section-header">
          <div>
            <Title level={3} className="menu-section-title">
              {t("menu.browseTitle")}
            </Title>
            <Text type="secondary">{t("menu.browseSubtitle")}</Text>
          </div>
          <Tag className="menu-count">
            {filteredItems.length} {t("menu.itemsLabel")}
          </Tag>
        </div>
        <Space wrap className="menu-filters">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              type="text"
              className={`menu-filter ${activeCategory === option.value ? "is-active" : ""}`}
              onClick={() => setActiveCategory(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </Space>

        <Row gutter={[24, 24]}>
          {filteredItems.map((item) => {
            const accent = accentMap[item.category] ?? "#60a5fa";
            return (
              <Col xs={24} sm={12} lg={8} key={item.id}>
                <Card
                  variant="borderless"
                  className="menu-card glass-card"
                  style={{ "--accent": accent } as CSSProperties}
                >
                  <div className="menu-card-header">
                    <Tag className="menu-category-tag">{categoryLabel(item.category)}</Tag>
                    <Text className="menu-price">{formatter.format(item.price)}</Text>
                  </div>
                  <Text className="menu-card-title">{item.name}</Text>
                  <Text type="secondary" className="menu-card-description">
                    {item.description}
                  </Text>
                  <div className="menu-card-footer">
                    <Button type="text" className="menu-add">
                      {t("menu.addToOrder")}
                    </Button>
                    <Tag className="menu-accent-tag" color="default">
                      {t("menu.available")}
                    </Tag>
                  </div>
                </Card>
              </Col>
            );
          })}
          {filteredItems.length === 0 && (
            <Col span={24}>
              <Card variant="borderless" className="menu-empty glass-card">
                <Text type="secondary">{t("menu.empty")}</Text>
              </Card>
            </Col>
          )}
        </Row>
      </Space>
    </div>
  );
}
