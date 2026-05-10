import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Eye, Trash2, ToggleLeft, ToggleRight, Plus } from "lucide-react";
import { API } from "../../utils/api";
import { toast } from "sonner";
import { DataTable } from "../ui/DataTable";
import { createColumnHelper } from "@tanstack/react-table";

const columnHelper = createColumnHelper();

export const MyListingsTab = ({ products, onChange }) => {
  const [creating, setCreating] = useState(false);

  const togglePublish = async (id, current) => {
    try {
      await axios.patch(`${API}/marketplace/products/${id}/publish`, { published: !current }, { withCredentials: true });
      toast.success(!current ? "Product is now live" : "Product unpublished");
      onChange();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update");
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product forever?")) return;
    try {
      await axios.delete(`${API}/marketplace/products/${id}`, { withCredentials: true });
      toast.success("Product deleted");
      onChange();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete");
    }
  };

  const columns = [
    columnHelper.accessor("title", {
      header: "Product",
      cell: (info) => {
        const p = info.row.original;
        return (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 border-2 border-black ${p.published ? "bg-pastel-mint text-black" : "bg-muted text-foreground"
                }`}>
                {p.published ? "LIVE" : "DRAFT"}
              </span>
              <span className="font-black text-sm">{p.title}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {(p.source_price_cents / 100).toLocaleString("en-IN", { style: "currency", currency: p.currency || "INR" })} · {p.purchase_count || 0} sales
            </p>
          </div>
        );
      },
    }),
    columnHelper.accessor("category", {
      header: "Category",
      cell: (info) => <span className="text-xs font-bold uppercase">{info.getValue()}</span>,
    }),
    columnHelper.accessor("created_at", {
      header: "Created",
      cell: (info) => <span className="text-xs text-muted-foreground">{new Date(info.getValue()).toLocaleDateString()}</span>,
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const p = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <Link to={`/marketplace/${p.product_id}`} className="neo-btn neo-btn-secondary px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1" target="_blank" rel="noopener noreferrer">
              <Eye className="w-3 h-3" /> Preview
            </Link>
            <button onClick={() => togglePublish(p.product_id, p.published)} className="neo-btn neo-btn-secondary px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1">
              {p.published ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
              {p.published ? "Unpublish" : "Publish"}
            </button>
            <button onClick={() => deleteProduct(p.product_id)} className="neo-btn px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 border-red-300 text-red-500 hover:bg-red-50">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      },
    }),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-lg uppercase">My Listings</h3>
        <button
          onClick={() => setCreating(true)}
          className="neo-btn neo-btn-primary px-4 py-2 text-sm font-black inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="neo-card p-8 text-center">
          <p className="text-muted-foreground mb-3">No listings yet.</p>
          <button onClick={() => setCreating(true)} className="neo-btn neo-btn-primary px-4 py-2 text-sm font-black">
            Create your first product
          </button>
        </div>
      ) : (
        <DataTable data={products} columns={columns} />
      )}
    </div>
  );
};
