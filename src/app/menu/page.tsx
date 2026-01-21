"use client";

import { MenuItemPreview3D } from "@/features/menu/components/MenuItemPreview3D";
import { OrderBurstCanvas, type OrderBurstHandle } from "@/features/menu/components/OrderBurstCanvas";
import { menuCategories } from "@/features/menu/constants";
import { useMenuItems } from "@/features/menu/hooks/useMenuItems";
import type { MenuItem } from "@/features/menu/types";
import { useLocale } from "@/hooks/useLocale";
import { useTheme } from "@/hooks/useTheme";
import { BulbOutlined, MoonOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import { Playfair_Display, Space_Grotesk } from "next/font/google";
import Image from "next/image";
import { useMemo, useRef, useState, type CSSProperties } from "react";

const { Title, Paragraph, Text } = Typography;

const displayFont = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });
const bodyFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-body" });

type SortKey = "featured" | "priceAsc" | "priceDesc" | "nameAsc" | "nameDesc";

const accentMap: Record<string, string> = {
  coffee: "#b45309",
  tea: "#0f766e",
  dessert: "#e11d48",
  food: "#2563eb",
  other: "#64748b",
};

export default function MenuPage() {
  const { items } = useMenuItems({ initialFetchPath: "/api/menus?type=extra&topics=nam-moi" });
  const { t, locale, setLocale } = useLocale();
  const { isDark, setMode } = useTheme();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("featured");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [zoomedItem, setZoomedItem] = useState<MenuItem | null>(null);
  const burstRef = useRef<OrderBurstHandle>(null);

  const formatter = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

  const availableItems = useMemo(() => items.filter((item) => item.available), [items]);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const nameCollator = useMemo(() => new Intl.Collator(locale === "vi" ? "vi-VN" : "en-US"), [locale]);

  const filteredItems = useMemo(() => {
    const searched = normalizedSearch
      ? availableItems.filter((item) => {
          const name = t(item.name).toLowerCase();
          const description = item.description ? t(item.description).toLowerCase() : "";
          return name.includes(normalizedSearch) || description.includes(normalizedSearch);
        })
      : availableItems;
    const categoryFiltered =
      activeCategory === "all" ? searched : searched.filter((item) => item.category === activeCategory);
    const sorted = [...categoryFiltered];
    switch (sortKey) {
      case "priceAsc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "priceDesc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "nameAsc":
        sorted.sort((a, b) => nameCollator.compare(t(a.name), t(b.name)));
        break;
      case "nameDesc":
        sorted.sort((a, b) => nameCollator.compare(t(b.name), t(a.name)));
        break;
      default:
        break;
    }
    return sorted;
  }, [activeCategory, availableItems, nameCollator, normalizedSearch, sortKey, t]);
  const averagePrice =
    availableItems.length === 0
      ? 0
      : availableItems.reduce((sum, item) => sum + item.price, 0) / availableItems.length;
  const activeSelectedItem = useMemo(() => {
    if (filteredItems.length === 0) {
      return null;
    }
    if (selectedItemId) {
      const match = filteredItems.find((item) => item.id === selectedItemId);
      if (match) {
        return match;
      }
    }
    return filteredItems[0] ?? null;
  }, [filteredItems, selectedItemId]);

  const activeSelectedId = activeSelectedItem?.id ?? null;

  const handleCardMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const tiltX = ((y / rect.height) * 2 - 1) * -6;
    const tiltY = ((x / rect.width) * 2 - 1) * 6;
    card.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
  };

  const handleCardMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    const card = event.currentTarget;
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  };

  const handleAddToOrder = (item: MenuItem, event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setSelectedItemId(item.id);
    if (globalThis.window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    burstRef.current?.burstAt(event.clientX, event.clientY);
  };

  const handleImageZoom = (item: MenuItem, event?: React.SyntheticEvent) => {
    event?.stopPropagation();
    if (!item.imageUrl?.trim()) {
      return;
    }
    setSelectedItemId(item.id);
    setZoomedItem(item);
  };

  const handleCardKeyDown =
    (item: MenuItem) => (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.currentTarget !== event.target) {
        return;
      }
      if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") {
        return;
      }
      event.preventDefault();
      setSelectedItemId(item.id);
    };

  const spotlightItem = activeSelectedItem;

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

  const sortOptions = useMemo(
    () => [
      { value: "featured", label: t("menu.sort.featured") },
      { value: "priceAsc", label: t("menu.sort.priceAsc") },
      { value: "priceDesc", label: t("menu.sort.priceDesc") },
      { value: "nameAsc", label: t("menu.sort.nameAsc") },
      { value: "nameDesc", label: t("menu.sort.nameDesc") },
    ],
    [t],
  );

  const specialItems = useMemo(() => {
    if (availableItems.length === 0) {
      return [];
    }
    const sortedByPrice = [...availableItems].sort((a, b) => b.price - a.price);
    const picks: MenuItem[] = [];
    const pushUnique = (item: MenuItem | undefined) => {
      if (!item || picks.some((existing) => existing.id === item.id)) {
        return;
      }
      picks.push(item);
    };
    pushUnique(sortedByPrice[0]);
    pushUnique(sortedByPrice[Math.floor(sortedByPrice.length / 2)]);
    pushUnique(sortedByPrice[sortedByPrice.length - 1]);
    return picks;
  }, [availableItems]);

  const specialBadgeKeys = [
    "menu.specials.labels.signature",
    "menu.specials.labels.popular",
    "menu.specials.labels.value",
  ];

  const zoomedImageUrl = zoomedItem?.imageUrl?.trim();

  return (
    <div className={`menu-shell ${displayFont.variable} ${bodyFont.variable}`}>
      <div className="menu-backdrop" />
      <OrderBurstCanvas ref={burstRef} />
      <Space direction="vertical" size="large" style={{ width: "100%" }} className="menu-content">
        <div className="menu-topbar">
          <div className="menu-theme-toggle">
            <Text className="menu-theme-label">{t("menu.theme.label")}</Text>
            <Switch
              checked={isDark}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<BulbOutlined />}
              onChange={(checked) => setMode(checked ? "dark" : "light")}
              aria-label={t("menu.theme.label")}
            />
          </div>
          <div className="menu-locale-toggle">
            <Text className="menu-locale-label">{t("menu.language.label")}</Text>
            <Segmented
              size="small"
              name="public-menu-locale-toggle"
              options={[
                { label: "VI", value: "vi" },
                { label: "EN", value: "en" },
              ]}
              value={locale}
              onChange={(value) => setLocale(value as "vi" | "en")}
            />
          </div>
        </div>
        <Card variant="borderless" className="menu-hero glass-card">
          <Row gutter={[32, 32]} align="middle">
            <Col xs={24} lg={14}>
              <Space direction="vertical" size="middle">
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
                  {spotlightItem ? (
                    <Space direction="vertical" size={8}>
                      <MenuItemPreview3D
                        imageUrl={spotlightItem.imageUrl}
                        accent={accentMap[spotlightItem.category] ?? "#f97316"}
                      />
                      <Text className="menu-spotlight-name">{t(spotlightItem.name)}</Text>
                      {spotlightItem.description && (
                        <Text type="secondary">{t(spotlightItem.description)}</Text>
                      )}
                      <Text className="menu-spotlight-price">
                        {formatter.format(spotlightItem.price)}
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

        {specialItems.length > 0 && (
          <div className="menu-specials">
            <div className="menu-specials-header">
              <div>
                <Title level={3} className="menu-specials-title">
                  {t("menu.specials.title")}
                </Title>
                <Text type="secondary" className="menu-specials-subtitle">
                  {t("menu.specials.subtitle")}
                </Text>
              </div>
              <Tag className="menu-specials-tag">{t("menu.specials.tag")}</Tag>
            </div>
            <Row gutter={[20, 20]} className="menu-specials-grid">
              {specialItems.map((item, index) => {
                const accent = accentMap[item.category] ?? "#f97316";
                const imageUrl = item.imageUrl?.trim();
                const badgeKey = specialBadgeKeys[index] ?? "menu.specials.labels.signature";
                const isActive = activeSelectedId === item.id;
                const isFeatured = index === 0;
                return (
                  <Col xs={24} md={12} lg={isFeatured ? 12 : 6} key={item.id}>
                    <Card
                      variant="borderless"
                      className={`menu-special-card glass-card${isFeatured ? " menu-special-card--featured" : ""}${
                        isActive ? " is-active" : ""
                      }`}
                      style={{ "--accent": accent } as CSSProperties}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isActive}
                      onClick={() => setSelectedItemId(item.id)}
                      onKeyDown={handleCardKeyDown(item)}
                      onMouseMove={handleCardMouseMove}
                      onMouseLeave={handleCardMouseLeave}
                    >
                      <div className="menu-special-top">
                        <Tag className="menu-special-badge">{t(badgeKey)}</Tag>
                        <Text className="menu-special-price">{formatter.format(item.price)}</Text>
                      </div>
                      {imageUrl ? (
                        <button
                          type="button"
                          className="menu-special-media menu-zoomable"
                          aria-label={t(item.name)}
                          onClick={(event) => handleImageZoom(item, event)}
                        >
                          <Image
                            src={imageUrl}
                            alt={t(item.name)}
                            fill
                            sizes="(max-width: 768px) 100vw, 320px"
                          />
                        </button>
                      ) : (
                        <div className="menu-special-media" />
                      )}
                      <Text className="menu-special-name">{t(item.name)}</Text>
                      {item.description && (
                        <Text type="secondary" className="menu-special-description">
                          {t(item.description)}
                        </Text>
                      )}
                      <div className="menu-special-footer">
                        <Tag className="menu-special-category">{categoryLabel(item.category)}</Tag>
                        <Button
                          type="text"
                          className="menu-special-action menu-add"
                          onClick={(event) => handleAddToOrder(item, event)}
                        >
                          {t("menu.specials.cta")}
                        </Button>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>
        )}

        <div className="menu-section-header">
          <div>
            <Title level={3} className="menu-section-title">
              {t("menu.browseTitle")}
            </Title>
            <Text type="secondary" className="menu-section-subtitle">
              {t("menu.browseSubtitle")}
            </Text>
          </div>
          <Tag className="menu-count">
            {filteredItems.length} {t("menu.itemsLabel")}
          </Tag>
        </div>
        <div className="menu-toolbar">
          <div className="menu-toolbar-field">
            <Text className="menu-field-label">{t("menu.search.label")}</Text>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t("menu.search.placeholder")}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              size="large"
            />
          </div>
          <div className="menu-toolbar-field">
            <Text className="menu-field-label">{t("menu.sort.label")}</Text>
            <Select
              value={sortKey}
              onChange={(value) => setSortKey(value as SortKey)}
              options={sortOptions}
              size="large"
              classNames={{ popup: { root: "menu-sort-dropdown" } }}
            />
          </div>
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
            const imageUrl = item.imageUrl?.trim();
            const isActive = activeSelectedId === item.id;
            return (
              <Col xs={24} sm={12} lg={8} key={item.id}>
                <Card
                  variant="borderless"
                  className="menu-card glass-card"
                  style={{ "--accent": accent } as CSSProperties}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  onClick={() => setSelectedItemId(item.id)}
                  onKeyDown={handleCardKeyDown(item)}
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                >
                  {imageUrl ? (
                    <button
                      type="button"
                      className="menu-card-media menu-zoomable"
                      aria-label={t(item.name)}
                      onClick={(event) => handleImageZoom(item, event)}
                    >
                      <Image
                        src={imageUrl}
                        alt={t(item.name)}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </button>
                  ) : (
                    <div className="menu-card-media" />
                  )}
                  <div className="menu-card-header">
                    <Tag className="menu-category-tag">{categoryLabel(item.category)}</Tag>
                    <Text className="menu-price">{formatter.format(item.price)}</Text>
                  </div>
                  <Text className="menu-card-title">{t(item.name)}</Text>
                  {item.description && (
                    <Text type="secondary" className="menu-card-description">
                      {t(item.description)}
                    </Text>
                  )}
                  <div className="menu-card-footer">
                    <Button type="text" className="menu-add" onClick={(event) => handleAddToOrder(item, event)}>
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
      <Modal
        open={Boolean(zoomedImageUrl)}
        onCancel={() => setZoomedItem(null)}
        footer={null}
        centered
        width={720}
        className={`menu-zoom-modal ${displayFont.variable} ${bodyFont.variable}`}
      >
        {zoomedItem && zoomedImageUrl ? (
          <div className="menu-zoom-body">
            <div className="menu-zoom-media">
              <Image
                src={zoomedImageUrl}
                alt={t(zoomedItem.name)}
                fill
                sizes="(max-width: 768px) 92vw, 720px"
              />
            </div>
            <div className="menu-zoom-meta">
              <Text className="menu-zoom-name">{t(zoomedItem.name)}</Text>
              {zoomedItem.description && (
                <Text type="secondary" className="menu-zoom-description">
                  {t(zoomedItem.description)}
                </Text>
              )}
              <Text className="menu-zoom-price">{formatter.format(zoomedItem.price)}</Text>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
