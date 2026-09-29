import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { District } from "./types";
import { levels } from "./engine";
export type Boundaries = FeatureCollection<
  Geometry,
  { code: string; name: string; district: string }
>;
export default function MapView({
  geo,
  districts,
  selected,
  visibleCodes,
  onSelect,
}: {
  geo: Boundaries;
  districts: District[];
  selected: string;
  visibleCodes: Set<string>;
  onSelect: (code: string) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.GeoJSON | null>(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  useEffect(() => {
    if (!element.current) return;
    const instance = L.map(element.current, {
      zoomControl: false,
      attributionControl: true,
      minZoom: 9,
      maxZoom: 15,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      scrollWheelZoom: true,
    });
    map.current = instance;
    L.control.zoom({ position: "bottomright" }).addTo(instance);
    instance.attributionControl.setPrefix(false);
    instance.attributionControl.addAttribution(
      '경계: SGIS · <a href="https://github.com/vuski/admdongkor" target="_blank" rel="noopener noreferrer">vuski/admdongkor</a> (CC BY 4.0)',
    );
    const bounds = L.geoJSON(geo).getBounds();
    instance.fitBounds(bounds, { padding: [28, 28] });
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
    };
  }, [geo]);
  useEffect(() => {
    if (!map.current) return;
    const index = new Map(districts.map((d) => [d.code, d]));
    const group = L.geoJSON(geo, {
      style: (feature) => {
        const code = String(feature?.properties.code),
          d = index.get(code),
          active = selected === code,
          visible = visibleCodes.has(code);
        return {
          color: active ? "#183c50" : "#ffffff",
          weight: active ? 3 : 0.8,
          fillColor: d ? levels[d.risk_level].color : levels.unknown.color,
          fillOpacity: visible ? (active ? 0.96 : 0.8) : 0.12,
          opacity: visible ? 1 : 0.5,
        };
      },
      onEachFeature: (feature, polygon) => {
        const code = String(feature.properties.code),
          d = index.get(code);
        if (!d) return;
        const tooltip = document.createElement("div");
        tooltip.textContent = `${d.district} ${d.name} · ${levels[d.risk_level].label} ${d.risk_score === null ? "" : `${d.risk_score}점`}`;
        polygon.bindTooltip(tooltip, {
          sticky: selected !== code,
          permanent: selected === code,
          direction: "top",
          className: "district-tooltip",
        });
        polygon.on("click", () => selectRef.current(code));
        polygon.on("add", () => {
          const path = (polygon as L.Path).getElement();
          path?.setAttribute("aria-label", tooltip.textContent || d.name);
          // The synchronized district list is the keyboard navigation surface.
        });
      },
    }).addTo(map.current);
    layer.current = group;
    group.eachLayer((polygon) => {
      if (
        String(
          (polygon as L.Path & { feature: Feature }).feature?.properties?.code,
        ) === selected
      )
        (polygon as L.Path).bringToFront();
    });
    return () => {
      group.remove();
    };
  }, [geo, districts, selected, visibleCodes]);
  return (
    <div className="map-shell">
      <div
        ref={element}
        className="map-canvas"
        role="img"
        aria-label="서울 행정동별 시연 위험 지도. 지역 선택은 왼쪽 행정동 목록에서도 가능합니다."
      />
      <button
        className="map-reset"
        onClick={() =>
          map.current?.fitBounds(L.geoJSON(geo).getBounds(), {
            padding: [28, 28],
          })
        }
      >
        서울 전체 보기
      </button>
      <div className="map-note">
        서울특별시 <span>행정동 관측 지도</span>
      </div>
    </div>
  );
}
