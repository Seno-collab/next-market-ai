"use client";

import type { CartItem } from "@/features/menu/types";
import {
  CloseOutlined,
  DeleteOutlined,
  MinusOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { Badge, Button, Drawer, Empty } from "antd";
import Image from "next/image";
import { useMemo } from "react";
import "./CartDrawer.css";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  locale?: string;
  t: (key: string) => string;
}

export function CartDrawer({
  open,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  locale = "vi",
  t,
}: CartDrawerProps) {
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.totalPrice, 0),
    [items]
  );

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const getOptionNames = (cartItem: CartItem) => {
    const names: string[] = [];
    cartItem.menuItem.optionGroups?.forEach((group) => {
      const selectedInGroup = cartItem.selectedOptions[group.id] || [];
      selectedInGroup.forEach((optionId) => {
        const option = group.options.find((o) => o.id === optionId);
        if (option) {
          const qty = cartItem.optionQuantities[optionId] || 1;
          names.push(qty > 1 ? `${t(option.name)} x${qty}` : t(option.name));
        }
      });
    });
    return names;
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={420}
      className="cart-drawer"
      closable={false}
      title={
        <div className="cart-drawer-header">
          <div className="cart-drawer-title">
            <ShoppingCartOutlined />
            <span>{t("cart.title") || "Giỏ hàng"}</span>
            <Badge count={totalItems} className="cart-drawer-badge" />
          </div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className="cart-drawer-close"
          />
        </div>
      }
      footer={
        items.length > 0 ? (
          <div className="cart-drawer-footer">
            <div className="cart-drawer-summary">
              <div className="cart-summary-row">
                <span>{t("cart.subtotal") || "Tạm tính"}</span>
                <span className="cart-summary-value">{formatter.format(totalAmount)}</span>
              </div>
              <div className="cart-summary-row cart-summary-total">
                <span>{t("cart.total") || "Tổng cộng"}</span>
                <span className="cart-summary-value">{formatter.format(totalAmount)}</span>
              </div>
            </div>
            <Button
              type="primary"
              size="large"
              block
              className="cart-checkout-btn"
            >
              {t("cart.checkout") || "Đặt hàng"} - {formatter.format(totalAmount)}
            </Button>
            <Button
              type="text"
              danger
              size="small"
              onClick={onClearCart}
              className="cart-clear-btn"
            >
              {t("cart.clear") || "Xóa tất cả"}
            </Button>
          </div>
        ) : null
      }
    >
      <div className="cart-drawer-content">
        {items.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("cart.empty") || "Giỏ hàng trống"}
            className="cart-empty"
          />
        ) : (
          <div className="cart-items-list">
            {items.map((cartItem) => {
              const imageUrl = cartItem.menuItem.imageUrl?.trim();
              const optionNames = getOptionNames(cartItem);

              return (
                <div key={cartItem.id} className="cart-item">
                  <div className="cart-item-image">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={t(cartItem.menuItem.name)}
                        fill
                        sizes="80px"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div className="cart-item-placeholder">
                        <ShoppingCartOutlined />
                      </div>
                    )}
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-header">
                      <h4 className="cart-item-name">{t(cartItem.menuItem.name)}</h4>
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onRemoveItem(cartItem.id)}
                        className="cart-item-remove"
                      />
                    </div>
                    {optionNames.length > 0 && (
                      <p className="cart-item-options">{optionNames.join(", ")}</p>
                    )}
                    <div className="cart-item-footer">
                      <div className="cart-item-quantity">
                        <Button
                          size="small"
                          icon={<MinusOutlined />}
                          onClick={() =>
                            onUpdateQuantity(cartItem.id, Math.max(1, cartItem.quantity - 1))
                          }
                          disabled={cartItem.quantity <= 1}
                        />
                        <span className="cart-item-qty-value">{cartItem.quantity}</span>
                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => onUpdateQuantity(cartItem.id, cartItem.quantity + 1)}
                        />
                      </div>
                      <span className="cart-item-price">
                        {formatter.format(cartItem.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Drawer>
  );
}

// Floating Cart Button Component
interface CartFloatingButtonProps {
  itemCount: number;
  totalAmount: number;
  onClick: () => void;
  locale?: string;
}

export function CartFloatingButton({
  itemCount,
  totalAmount,
  onClick,
  locale = "vi",
}: CartFloatingButtonProps) {
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  if (itemCount === 0) return null;

  return (
    <button type="button" className="cart-floating-btn" onClick={onClick}>
      <div className="cart-floating-left">
        <Badge count={itemCount} size="small">
          <ShoppingCartOutlined className="cart-floating-icon" />
        </Badge>
        <span className="cart-floating-label">Xem giỏ hàng</span>
      </div>
      <span className="cart-floating-total">{formatter.format(totalAmount)}</span>
    </button>
  );
}
