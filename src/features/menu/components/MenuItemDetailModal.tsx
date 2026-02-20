"use client";

import type { MenuItem, MenuItemOption, MenuItemOptionGroup } from "@/features/menu/types";
import { CheckOutlined, MinusOutlined, PlusOutlined, ShoppingOutlined } from "@ant-design/icons";
import { Button, Modal, Radio, Checkbox, InputNumber, Tag } from "antd";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./MenuItemDetailModal.css";

type SelectedOptions = Record<number, number[]>; // groupId -> optionIds[]
type OptionQuantities = Record<number, number>; // optionId -> quantity

interface MenuItemDetailModalProps {
  item: MenuItem | null;
  open: boolean;
  onClose: () => void;
  onAddToCart?: (item: MenuItem, selectedOptions: SelectedOptions, quantities: OptionQuantities, totalPrice: number) => void;
  locale?: string;
  t: (key: string) => string;
}

export function MenuItemDetailModal({
  item,
  open,
  onClose,
  onAddToCart,
  locale = "vi",
  t,
}: MenuItemDetailModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({});
  const [optionQuantities, setOptionQuantities] = useState<OptionQuantities>({});
  const [quantity, setQuantity] = useState(1);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setSelectedOptions({});
      setOptionQuantities({});
      setQuantity(1);
    }
  }, [item?.id]);

  const handleSingleSelect = useCallback((groupId: number, optionId: number) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupId]: [optionId],
    }));
  }, []);

  const handleMultiSelect = useCallback(
    (groupId: number, optionId: number, checked: boolean, maxSelect: number) => {
      setSelectedOptions((prev) => {
        const current = prev[groupId] || [];
        if (checked) {
          if (current.length >= maxSelect) {
            return prev;
          }
          return { ...prev, [groupId]: [...current, optionId] };
        }
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      });
    },
    []
  );

  const handleQuantityChange = useCallback((optionId: number, value: number) => {
    setOptionQuantities((prev) => ({
      ...prev,
      [optionId]: value,
    }));
  }, []);

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (!item) return 0;
    const basePrice = item.basePrice ?? item.price;
    let optionsPrice = 0;

    item.optionGroups?.forEach((group) => {
      const selectedInGroup = selectedOptions[group.id] || [];
      selectedInGroup.forEach((optionId) => {
        const option = group.options.find((o) => o.id === optionId);
        if (option) {
          const delta = typeof option.priceDelta === "string" ? parseFloat(option.priceDelta) : option.priceDelta;
          const qty = optionQuantities[optionId] || 1;
          optionsPrice += (delta || 0) * qty;
        }
      });
    });

    return (basePrice + optionsPrice) * quantity;
  }, [item, selectedOptions, optionQuantities, quantity]);

  // Check if all required options are selected
  const isValid = useMemo(() => {
    if (!item?.optionGroups) return true;
    return item.optionGroups.every((group) => {
      if (!group.isRequired) return true;
      const selected = selectedOptions[group.id] || [];
      return selected.length >= group.minSelect;
    });
  }, [item, selectedOptions]);

  const handleAddToCart = () => {
    if (!item || !isValid) return;
    onAddToCart?.(item, selectedOptions, optionQuantities, totalPrice);
    onClose();
  };

  const imageUrl = item?.imageUrl?.trim();
  const hasOptions = item?.optionGroups && item.optionGroups.length > 0;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={480}
      className="menu-item-detail-modal"
      destroyOnHidden
    >
      {item && (
      <div className="menu-detail-content">
        {/* Image */}
        {imageUrl && (
          <div className="menu-detail-image">
            <Image
              src={imageUrl}
              alt={t(item.name)}
              fill
              sizes="480px"
              style={{ objectFit: "cover" }}
            />
          </div>
        )}

        {/* Info */}
        <div className="menu-detail-info">
          <h2 className="menu-detail-name">{t(item.name)}</h2>
          {item.description && (
            <p className="menu-detail-desc">{t(item.description)}</p>
          )}
          <div className="menu-detail-base-price">
            {formatter.format(item.basePrice ?? item.price)}
          </div>
        </div>

        {/* Option Groups */}
        {hasOptions && (
          <div className="menu-detail-options">
            {item.optionGroups!
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
              .map((group) => (
                <OptionGroupSection
                  key={group.id}
                  group={group}
                  selectedOptions={selectedOptions[group.id] || []}
                  optionQuantities={optionQuantities}
                  onSingleSelect={handleSingleSelect}
                  onMultiSelect={handleMultiSelect}
                  onQuantityChange={handleQuantityChange}
                  formatter={formatter}
                  t={t}
                />
              ))}
          </div>
        )}

        {/* Quantity & Add to Cart */}
        <div className="menu-detail-footer">
          <div className="menu-detail-quantity">
            <Button
              icon={<MinusOutlined />}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            />
            <span className="menu-detail-qty-value">{quantity}</span>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setQuantity((q) => q + 1)}
            />
          </div>
          <Button
            type="primary"
            size="large"
            icon={<ShoppingOutlined />}
            className="menu-detail-add-btn"
            onClick={handleAddToCart}
            disabled={!isValid}
          >
            <span>{t("menu.addToCart") || "Thêm"}</span>
            <span className="menu-detail-total">{formatter.format(totalPrice)}</span>
          </Button>
        </div>
      </div>
      )}
    </Modal>
  );
}

// Option Group Component
interface OptionGroupSectionProps {
  group: MenuItemOptionGroup;
  selectedOptions: number[];
  optionQuantities: OptionQuantities;
  onSingleSelect: (groupId: number, optionId: number) => void;
  onMultiSelect: (groupId: number, optionId: number, checked: boolean, maxSelect: number) => void;
  onQuantityChange: (optionId: number, value: number) => void;
  formatter: Intl.NumberFormat;
  t: (key: string) => string;
}

function OptionGroupSection({
  group,
  selectedOptions,
  optionQuantities,
  onSingleSelect,
  onMultiSelect,
  onQuantityChange,
  formatter,
  t,
}: OptionGroupSectionProps) {
  const isSingleSelect = group.maxSelect === 1;
  const sortedOptions = [...group.options].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="menu-option-group">
      <div className="menu-option-group-header">
        <span className="menu-option-group-name">{t(group.name)}</span>
        {group.isRequired && (
          <Tag color="red" className="menu-option-required-tag">
            {t("menu.required") || "Bắt buộc"}
          </Tag>
        )}
        {!isSingleSelect && group.maxSelect > 1 && (
          <span className="menu-option-hint">
            {t("menu.selectUpTo") || "Chọn tối đa"} {group.maxSelect}
          </span>
        )}
      </div>

      <div className="menu-option-list">
        {isSingleSelect ? (
          <Radio.Group
            value={selectedOptions[0]}
            onChange={(e) => onSingleSelect(group.id, e.target.value)}
            className="menu-option-radio-group"
          >
            {sortedOptions.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                isSelected={selectedOptions.includes(option.id)}
                formatter={formatter}
                t={t}
                renderSelector={
                  <Radio value={option.id} className="menu-option-radio" />
                }
              />
            ))}
          </Radio.Group>
        ) : (
          sortedOptions.map((option) => {
            const isSelected = selectedOptions.includes(option.id);
            const canSelectMore = selectedOptions.length < group.maxSelect;
            const showQuantity = isSelected && (option.quantityMax ?? 1) > 1;

            return (
              <OptionRow
                key={option.id}
                option={option}
                isSelected={isSelected}
                formatter={formatter}
                t={t}
                renderSelector={
                  <Checkbox
                    checked={isSelected}
                    disabled={!isSelected && !canSelectMore}
                    onChange={(e) =>
                      onMultiSelect(group.id, option.id, e.target.checked, group.maxSelect)
                    }
                    className="menu-option-checkbox"
                  />
                }
                showQuantity={showQuantity}
                quantity={optionQuantities[option.id] || 1}
                maxQuantity={option.quantityMax ?? 1}
                onQuantityChange={(value) => onQuantityChange(option.id, value)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// Single Option Row
interface OptionRowProps {
  option: MenuItemOption;
  isSelected: boolean;
  formatter: Intl.NumberFormat;
  t: (key: string) => string;
  renderSelector: React.ReactNode;
  showQuantity?: boolean;
  quantity?: number;
  maxQuantity?: number;
  onQuantityChange?: (value: number) => void;
}

function OptionRow({
  option,
  isSelected,
  formatter,
  t,
  renderSelector,
  showQuantity,
  quantity = 1,
  maxQuantity = 1,
  onQuantityChange,
}: OptionRowProps) {
  const priceDelta = typeof option.priceDelta === "string" ? parseFloat(option.priceDelta) : option.priceDelta;
  const hasPriceDelta = priceDelta && priceDelta !== 0;

  return (
    <div className={`menu-option-row ${isSelected ? "selected" : ""}`}>
      <div className="menu-option-left">
        {renderSelector}
        <span className="menu-option-name">{t(option.name)}</span>
      </div>
      <div className="menu-option-right">
        {showQuantity && onQuantityChange && (
          <InputNumber
            min={1}
            max={maxQuantity}
            value={quantity}
            onChange={(value) => onQuantityChange(value ?? 1)}
            size="small"
            className="menu-option-qty-input"
          />
        )}
        {hasPriceDelta && (
          <span className="menu-option-price">
            {priceDelta > 0 ? "+" : ""}
            {formatter.format(priceDelta)}
          </span>
        )}
        {isSelected && <CheckOutlined className="menu-option-check" />}
      </div>
    </div>
  );
}
