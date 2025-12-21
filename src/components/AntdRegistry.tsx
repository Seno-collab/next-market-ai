"use client";

import { useServerInsertedHTML } from "next/navigation";
import {
  StyleProvider,
  createCache,
  extractStyle,
  type Cache,
} from "@ant-design/cssinjs";
import { useState } from "react";

export default function AntdRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cache] = useState<Cache>(() => createCache());

  useServerInsertedHTML(() => (
    <style
      id="antd"
      dangerouslySetInnerHTML={{ __html: extractStyle(cache, true) }}
    />
  ));

  return <StyleProvider cache={cache}>{children}</StyleProvider>;
}
