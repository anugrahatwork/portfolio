"use client";

import React from "react";

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="px-4 py-2 bg-accent hover:opacity-90 rounded text-sm font-bold shadow cursor-pointer"
      type="button"
    >
      Print / Save PDF
    </button>
  );
}
