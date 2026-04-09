import React from "react";
import { Header } from "../components/Header";

export default function ErrorExplainer() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4 text-center">
        <h1 className="text-4xl font-black">Explain This Error</h1>
        <p className="text-zinc-500 mt-4">Coming soon...</p>
      </main>
    </div>
  );
}
