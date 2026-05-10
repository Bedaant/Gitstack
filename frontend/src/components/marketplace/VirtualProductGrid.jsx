import React, { useMemo } from "react";
import { Grid } from "react-window";
import { ProductCard } from "../ui/ProductCard";

const CARD_WIDTH = 380;
const CARD_HEIGHT = 420;
const GAP = 20;

function InnerGrid({ columnCount, products, style }) {
  const items = [];
  for (let row = 0; row < Math.ceil(products.length / columnCount); row++) {
    for (let col = 0; col < columnCount; col++) {
      const idx = row * columnCount + col;
      if (idx >= products.length) break;
      const left = col * (CARD_WIDTH + GAP);
      const top = row * (CARD_HEIGHT + GAP);
      items.push(
        <div
          key={products[idx].product_id}
          style={{
            position: "absolute",
            left,
            top,
            width: CARD_WIDTH,
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

  const rowCount = Math.ceil(products.length / columnCount);
  const gridWidth = columnCount * CARD_WIDTH + (columnCount - 1) * GAP;
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
        columnWidth={CARD_WIDTH + GAP}
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
