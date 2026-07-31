"use client";

import { useEffect, useRef } from "react";

export default function TradingViewWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: "400",
      symbol: "BMFBOVESPA:DI1F27",
      interval: "D",
      timezone: "America/Sao_Paulo",
      theme: "dark",
      style: "1",
      locale: "br",
      backgroundColor: "#090d16",
      gridColor: "#1e293b",
      hide_top_toolbar: true,
      hide_legend: true,
      save_image: false,
      hide_volume: true
    });

    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="w-full h-[400px] border border-slate-800 rounded-xl overflow-hidden" ref={containerRef} />
  );
}
