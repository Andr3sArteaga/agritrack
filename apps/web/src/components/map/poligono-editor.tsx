"use client";

import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";
import * as L from "leaflet";
import { useEffect, useRef } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import type { Parcela, PoligonoGeoJson } from "@/lib/types";
import { BaseMap } from "./base-map";
import {
  calcularHectareas,
  latLngsAPoligono,
  poligonoALatLngs,
} from "./poligono-utils";

const OPCIONES_TOOLBAR: L.PM.ToolbarOptions = {
  position: "topleft",
  drawMarker: false,
  drawCircleMarker: false,
  drawPolyline: false,
  drawRectangle: false,
  drawCircle: false,
  drawText: false,
  drawPolygon: true,
  editMode: true,
  dragMode: false,
  cutPolygon: false,
  removalMode: true,
  rotateMode: false,
  splitMode: false,
  scaleMode: false,
  snappingOption: false,
  pinningOption: false,
  autoTracingOption: false,
  snapGuidesOption: false,
};

function GeomanController({
  valorInicial,
  onChange,
}: {
  valorInicial: PoligonoGeoJson | null;
  onChange: (poligono: PoligonoGeoJson | null, areaHa: number | null) => void;
}) {
  const map = useMap();
  const layerRef = useRef<L.Polygon | null>(null);

  useEffect(() => {
    map.pm.addControls(OPCIONES_TOOLBAR);

    function anillo(layer: L.Polygon): L.LatLng[] {
      const latlngs = layer.getLatLngs();
      return (Array.isArray(latlngs[0]) ? latlngs[0] : latlngs) as L.LatLng[];
    }

    function reemplazarCapa(layer: L.Polygon) {
      if (layerRef.current && layerRef.current !== layer) {
        layerRef.current.remove();
      }
      layerRef.current = layer;

      const notificar = () => {
        const poligono = latLngsAPoligono(anillo(layer));
        onChange(poligono, calcularHectareas(poligono));
      };
      layer.on("pm:edit", notificar);
      layer.on("pm:markerdragend", notificar);
      layer.on("pm:remove", () => {
        if (layerRef.current === layer) {
          layerRef.current = null;
        }
        onChange(null, null);
      });
      notificar();
    }

    const handleCreate: L.PM.CreateEventHandler = (e) => {
      reemplazarCapa(e.layer as L.Polygon);
    };

    const handleVertexAdded: L.PM.VertexAddedEventHandler = (e) => {
      const working = e.workingLayer as L.Polygon | undefined;
      if (!working) return;
      const puntos = anillo(working);
      if (puntos.length < 3) return;
      const poligono = latLngsAPoligono(puntos);
      onChange(poligono, calcularHectareas(poligono));
    };

    map.on("pm:create", handleCreate);
    map.on("pm:vertexadded", handleVertexAdded);

    let enableTimeout: ReturnType<typeof setTimeout> | undefined;

    if (valorInicial && !layerRef.current) {
      const layer = L.polygon(poligonoALatLngs(valorInicial)).addTo(map);
      reemplazarCapa(layer);
      // Se difiere un tick para que Leaflet termine de proyectar la capa
      // antes de activar el modo edicion de Geoman sobre ella.
      enableTimeout = setTimeout(() => layer.pm.enable(), 0);
    }

    return () => {
      map.off("pm:create", handleCreate);
      map.off("pm:vertexadded", handleVertexAdded);
      map.pm.removeControls();
      if (enableTimeout) clearTimeout(enableTimeout);
      // Simetrico con el alta de arriba: en React StrictMode este efecto se
      // monta/limpia/vuelve a montar una vez en desarrollo, y si la capa
      // inicial no se retira aqui, el segundo montaje la deja "huerfana"
      // (agregada antes de que el mapa terminara su primer layout) sin
      // volver a proyectarla, y el poligono no se ve.
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
    };
    // Solo se inicializa una vez por instancia de mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

export function PoligonoEditor({
  valorInicial,
  otrasParcelas,
  onChange,
}: {
  valorInicial: PoligonoGeoJson | null;
  otrasParcelas: Parcela[];
  onChange: (poligono: PoligonoGeoJson | null, areaHa: number | null) => void;
}) {
  const referencias = otrasParcelas.filter((p) => p.activa && p.poligono);

  return (
    <BaseMap height={380}>
      {referencias.map((parcela) => (
        <GeoJSON
          key={parcela.id}
          data={parcela.poligono! as unknown as GeoJSON.GeoJsonObject}
          style={{ color: "#78716c", weight: 1, fillOpacity: 0.15 }}
        />
      ))}
      <GeomanController valorInicial={valorInicial} onChange={onChange} />
    </BaseMap>
  );
}
