import React, { useMemo } from "react";
import { Grid } from "react-window";
import { ProductCard } from "../ui/ProductCard";

const BASE_CARD_WIDTH = 380;
const CARD_HEIGHT = 420;
const GAP = 20;

function getCardWidth(containerWidth) {
  // On mobile, cap card width to container minus padding
  const maxWidth = Math.max(280, containerWidth - 32);
  return Math.min(BASE_CARD_WIDTH, maxWidth);
}

function InnerGrid({ columnCount, products, style, cardWidth }) {
  const items = [];
  for (let row = 0; row < Math.ceil(products.length / columnCount); row++) {
    for (let col = 0; col < columnCount; col++) {
      const idx = row * columnCount + col;
      if (idx >= products.length) break;
      const left = col * (cardWidth + GAP);
      const top = row * (CARD_HEIGHT + GAP);
      items.push(
        <div
          key={products[idx].product_id}
          style={{
            position: "absolute",
            left,
            top,
            width: cardWidth,
            height: CARD_HEIGHT,
          }}
        >
          <ProductCard product={products[idx]} />
        </div>
      );
    }
  }
  return <div style={{ ...style, position: "relative" }}>{items}</div>;
}

export function VirtualProductGrid({ products, width }) {
  const columnCount = useMemo(() => {
    if (width >= 1200) return 3;
    if (width >= 640) return 2;
    return 1;
  }, [width]);

  const cardWidth = getCardWidth(width);
  const rowCount = Math.ceil(products.length / columnCount);
  const gridWidth = columnCount * cardWidth + (columnCount - 1) * GAP;
  const gridHeight = rowCount * CARD_HEIGHT + (rowCount - 1) * GAP;

  // If list is small, just render normal grid to avoid virtualization overhead
  if (products.length <= 20) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((p) => (
          <ProductCard key={p.product_id} product={p} />
        ))}
      </div>
    );
  }

  const Cell = ({ columnIndex, rowIndex, style: cellStyle }) => {
    const idx = rowIndex * columnCount + columnIndex;
    if (idx >= products.length) return null;
    return (
      <div style={cellStyle}>
        <ProductCard product={products[idx]} />
      </div>
    );
  };

  return (
    <div style={{ width: gridWidth, maxWidth: "100%" }}>
      <Grid
        columnCount={columnCount}
        columnWidth={cardWidth + GAP}
        height={Math.min(gridHeight, 800)}
        rowCount={rowCount}
        rowHeight={CARD_HEIGHT + GAP}
        width={gridWidth}
        style={{ overflowX: "hidden" }}
      >
        {Cell}
      </Grid>
    </div>
  );
}
