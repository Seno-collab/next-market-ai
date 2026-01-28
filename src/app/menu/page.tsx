"use client";

import dynamic from "next/dynamic";
import { MenuItemPreview3D } from "@/features/menu/components/MenuItemPreview3D";
import { OrderBurstCanvas, type OrderBurstHandle } from "@/features/menu/components/OrderBurstCanvas";
import { menuCategories } from "@/features/menu/constants";
import { useMenuItems } from "@/features/menu/hooks/useMenuItems";
import type { MenuItem } from "@/features/menu/types";
import { useLocale } from "@/hooks/useLocale";
import { useTheme } from "@/hooks/useTheme";
import { BulbOutlined, MoonOutlined, SearchOutlined, CoffeeOutlined } from "@ant-design/icons";
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
  Spin,
  Switch,
  Tag,
  Typography,
} from "antd";
import { Playfair_Display, Space_Grotesk } from "next/font/google";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

// Dynamic import for Three.js components (no SSR)
const PublicMenuScene = dynamic(
  () => import("@/features/menu/components/PublicMenuScene"),
  { ssr: false, loading: () => <div className="public-menu-scene-loading"><Spin size="large" /></div> }
);

const MenuShowcaseScene = dynamic(
  () => import("@/features/menu/components/MenuShowcaseScene"),
  { ssr: false, loading: () => <div className="menu-showcase-scene-loading"><Spin size="large" /></div> }
);

const SignaturePicksScene = dynamic(
  () => import("@/features/menu/components/SignaturePicksScene"),
  { ssr: false, loading: () => <div className="signature-picks-scene-loading"><Spin size="small" /></div> }
);

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
  const { items: hookItems, loading: hookLoading, searchItems, searchMeta } = useMenuItems({
    initialFetchPath: "/api/menus",
    searchPath: "/api/menus",
    searchMethod: "GET",
    includeAuth: false,
    autoFetch: false,
    restaurantId: 9
  });
  const { t, locale, setLocale } = useLocale();
  const { isDark, setMode } = useTheme();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("featured");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [zoomedItem, setZoomedItem] = useState<MenuItem | null>(null);
  const burstRef = useRef<OrderBurstHandle>(null);

  // Infinite scroll state
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 20;

  const formatter = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

  // Load initial items
  useEffect(() => {
    const loadInitialItems = async () => {
      setCurrentPage(1);
      setAllItems([]);
      await searchItems({ limit: ITEMS_PER_PAGE, page: 1 });
    };
    loadInitialItems();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update allItems when hookItems change
  useEffect(() => {
    if (hookItems.length > 0) {
      if (currentPage === 1) {
        setAllItems(hookItems);
      } else {
        setAllItems((prev) => {
          const newItems = hookItems.filter(
            (item: MenuItem) => !prev.some((p) => p.id === item.id)
          );
          return [...prev, ...newItems];
        });
      }
      setIsLoadingMore(false);
    }
  }, [hookItems, currentPage]);

  // Update hasMore based on searchMeta
  useEffect(() => {
    if (searchMeta) {
      if (typeof searchMeta.hasMore === "boolean") {
        setHasMore(searchMeta.hasMore);
        return;
      }
      const { page, totalPages } = searchMeta;
      if (page !== null && totalPages !== null) {
        setHasMore(page < totalPages);
      }
    }
  }, [searchMeta]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || hookLoading) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    const nextCursor = searchMeta?.nextCursor;
    await searchItems({
      limit: ITEMS_PER_PAGE,
      page: nextCursor ? undefined : nextPage,
      cursor: nextCursor ?? undefined,
      filter: searchTerm || undefined,
      category: activeCategory === "all" ? undefined : activeCategory,
    });
  }, [activeCategory, currentPage, hasMore, hookLoading, isLoadingMore, searchItems, searchTerm, ITEMS_PER_PAGE, searchMeta?.nextCursor]);

  // Reset when category changes
  useEffect(() => {
    const resetAndReload = async () => {
      setCurrentPage(1);
      setAllItems([]);
      setHasMore(true);
      await searchItems({
        limit: ITEMS_PER_PAGE,
        page: 1,
        category: activeCategory === "all" ? undefined : activeCategory,
      });
    };
    resetAndReload();
  }, [activeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when search term changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setCurrentPage(1);
      setAllItems([]);
      setHasMore(true);
      await searchItems({
        limit: ITEMS_PER_PAGE,
        page: 1,
        filter: searchTerm || undefined,
        category: activeCategory === "all" ? undefined : activeCategory,
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting && hasMore && !isLoadingMore && !hookLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoadingMore, hookLoading, loadMore]);

  const availableItems = useMemo(() => allItems.filter((item) => item.available), [allItems]);
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
    // Lấy 3 món đắt nhất (top 3 highest price)
    const sortedByPrice = [...availableItems].sort((a, b) => b.price - a.price);
    return sortedByPrice.slice(0, 3);
  }, [availableItems]);

  const specialBadgeKeys = [
    "menu.specials.labels.signature",
    "menu.specials.labels.popular",
    "menu.specials.labels.value",
  ];

  const zoomedImageUrl = zoomedItem?.imageUrl?.trim();

  return (
    <div className={`menu-shell ${displayFont.variable} ${bodyFont.variable}`}>
      {/* SPECTACULAR 3D SHOWCASE - Full Screen Background */}
      <MenuShowcaseScene />

      {/* 3D Hero Header with Controls */}
      <div className="public-menu-3d-header">
        <div className="public-menu-header-overlay">
          <div className="public-menu-header-content">
            <div className="menu-header-top">
              <div className="menu-header-controls">
                <div className="menu-control-group">
                  <BulbOutlined style={{ fontSize: "16px", color: "#fff" }} />
                  <Switch
                    checked={isDark}
                    checkedChildren={<MoonOutlined />}
                    unCheckedChildren={<BulbOutlined />}
                    onChange={(checked) => setMode(checked ? "dark" : "light")}
                    aria-label={t("menu.theme.label")}
                    size="small"
                  />
                </div>
                <Segmented
                  size="small"
                  name="public-menu-locale-toggle"
                  options={[
                    { label: "VI", value: "vi" },
                    { label: "EN", value: "en" },
                  ]}
                  value={locale}
                  onChange={(value) => setLocale(value as "vi" | "en")}
                  style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
                />
              </div>
            </div>
            <div className="menu-header-main">
              <div className="public-menu-header-badge">
                <CoffeeOutlined /> {t("menu.heroBadge") || "Premium Selection"}
              </div>
              <h1 className="public-menu-header-title">
                {t("menu.qrTitle") || "Our Menu"}
              </h1>
              <p className="public-menu-header-subtitle">
                {t("menu.qrSubtitle") || "Discover our carefully crafted selection"}
              </p>
              <div className="menu-header-stats">
                <div className="menu-stat">
                  <span className="menu-stat-value">{availableItems.length}</span>
                  <span className="menu-stat-label">{t("analytics.totalItems")}</span>
                </div>
                <div className="menu-stat">
                  <span className="menu-stat-value">{formatter.format(averagePrice)}</span>
                  <span className="menu-stat-label">{t("analytics.averagePrice")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="menu-backdrop" />
      <OrderBurstCanvas ref={burstRef} />
      <Space orientation="vertical" size="large" style={{ width: "100%" }} className="menu-content">

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

            {/* 3D Signature Picks Scene */}
            <div className="signature-picks-3d-showcase">
              <SignaturePicksScene items={specialItems} />
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
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                          {item.basePrice && item.basePrice > item.price && (
                            <Text delete type="secondary" style={{ fontSize: "12px" }}>
                              {formatter.format(item.basePrice)}
                            </Text>
                          )}
                          <Text className="menu-special-price" style={item.basePrice && item.basePrice > item.price ? { color: "#ef4444" } : undefined}>
                            {formatter.format(item.price)}
                          </Text>
                        </div>
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

        {/* Browse Section with Integrated Search/Filter */}
        <div className="menu-browse-section">
          <div className="menu-browse-header">
            <div>
              <Title level={2} className="menu-browse-title" style={{ margin: 0 }}>
                {t("menu.browseTitle")}
              </Title>
              <Text type="secondary" style={{ fontSize: "15px" }}>
                {filteredItems.length} {t("menu.itemsLabel")}
              </Text>
            </div>
          </div>

          <div className="menu-browse-controls">
            <Input
              allowClear
              prefix={<SearchOutlined style={{ fontSize: "18px", color: "var(--menu-accent)" }} />}
              placeholder={t("menu.search.placeholder")}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              size="large"
              className="menu-search-input"
            />
            <div className="menu-filter-sort-group">
              <Space wrap className="menu-category-filters">
                {filterOptions.map((option) => (
                  <Button
                    key={option.value}
                    type={activeCategory === option.value ? "primary" : "default"}
                    className={`menu-category-btn ${activeCategory === option.value ? "is-active" : ""}`}
                    onClick={() => setActiveCategory(option.value)}
                    size="middle"
                  >
                    {option.label}
                  </Button>
                ))}
              </Space>
              <Select
                value={sortKey}
                onChange={(value) => setSortKey(value as SortKey)}
                options={sortOptions}
                size="large"
                className="menu-sort-select"
                suffixIcon={<span style={{ fontSize: "12px" }}>▼</span>}
              />
            </div>
          </div>
        </div>

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
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      {item.basePrice && item.basePrice > item.price && (
                        <Text delete type="secondary" style={{ fontSize: "12px" }}>
                          {formatter.format(item.basePrice)}
                        </Text>
                      )}
                      <Text className="menu-price" style={item.basePrice && item.basePrice > item.price ? { color: "#ef4444" } : undefined}>
                        {formatter.format(item.price)}
                      </Text>
                    </div>
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
          {filteredItems.length === 0 && !hookLoading && (
            <Col span={24}>
              <Card variant="borderless" className="menu-empty glass-card">
                <Text type="secondary">{t("menu.empty")}</Text>
              </Card>
            </Col>
          )}
        </Row>

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={loadMoreRef} style={{ height: "20px", margin: "20px 0" }}>
            {isLoadingMore && (
              <div style={{ textAlign: "center" }}>
                <Spin size="large" />
              </div>
            )}
          </div>
        )}

        {/* Loading initial items */}
        {hookLoading && currentPage === 1 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin size="large" />
          </div>
        )}
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
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                {zoomedItem.basePrice && zoomedItem.basePrice > zoomedItem.price ? (
                  <>
                    <Text delete type="secondary" style={{ fontSize: "16px" }}>
                      {formatter.format(zoomedItem.basePrice)}
                    </Text>
                    <Text className="menu-zoom-price" style={{ color: "#ef4444" }}>
                      {formatter.format(zoomedItem.price)}
                    </Text>
                  </>
                ) : (
                  <Text className="menu-zoom-price">{formatter.format(zoomedItem.price)}</Text>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
