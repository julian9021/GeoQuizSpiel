import { useMemo } from "react";
import { feature } from "topojson-client";
import { geoMercator, geoPath, geoArea, type GeoPermissibleObjects } from "d3-geo";
import type { Topology } from "topojson-specification";
import type { FeatureCollection, Feature, Geometry, Polygon, MultiPolygon } from "geojson";
import worldTopo from "world-atlas/countries-110m.json";
import { CCA3_TO_NUMERIC } from "./countryIdMap";

interface Props {
  chainCodes: string[];
  goalCode: string;
}

const WIDTH = 400;
const HEIGHT = 280;
const MARGIN = 30;

/**
 * For a MultiPolygon, return a Feature with only the largest polygon (mainland).
 * Prevents overseas territories from blowing up the bounding box.
 */
function mainlandFeature(f: Feature<Geometry>): Feature<Geometry> {
  const geom = f.geometry;
  if (geom.type !== "MultiPolygon") return f;

  const polys = (geom as MultiPolygon).coordinates;
  if (polys.length <= 1) return f;

  let largestIdx = 0;
  let largestArea = 0;
  for (let i = 0; i < polys.length; i++) {
    const poly: Feature<Polygon> = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: polys[i] },
    };
    const a = geoArea(poly);
    if (a > largestArea) {
      largestArea = a;
      largestIdx = i;
    }
  }

  return {
    ...f,
    geometry: { type: "Polygon", coordinates: polys[largestIdx] },
  };
}

export default function ChainMap({ chainCodes, goalCode }: Props) {
  const allCountries = useMemo(() => {
    const topo = worldTopo as unknown as Topology;
    const geo = feature(topo, topo.objects.countries) as FeatureCollection;
    return geo.features;
  }, []);

  const { chainFeatures, goalFeature, pathFn } = useMemo(() => {
    const numericIds = chainCodes.map((c) => CCA3_TO_NUMERIC[c]).filter(Boolean);
    const goalNumeric = CCA3_TO_NUMERIC[goalCode];

    const chainF = allCountries.filter((f) =>
      numericIds.includes(String(f.id))
    );
    const goalF = allCountries.find((f) => String(f.id) === goalNumeric) || null;

    if (chainF.length === 0) {
      return { chainFeatures: [], goalFeature: null, pathFn: null };
    }

    // Build a FeatureCollection of mainland-only versions for fitting
    const mainlandCollection: FeatureCollection = {
      type: "FeatureCollection",
      features: chainF.map(mainlandFeature),
    };

    const projection = geoMercator().fitExtent(
      [[MARGIN, MARGIN], [WIDTH - MARGIN, HEIGHT - MARGIN]],
      mainlandCollection as GeoPermissibleObjects
    );

    const pathGenerator = geoPath(projection);
    return { chainFeatures: chainF, goalFeature: goalF, pathFn: pathGenerator };
  }, [chainCodes, goalCode, allCountries]);

  if (!pathFn) return null;

  const goalPath = goalFeature ? pathFn(goalFeature as Feature<Geometry>) : null;

  return (
    <div className="chain-map">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="chain-map-svg">
        {goalPath && !chainCodes.includes(goalCode) && (
          <path
            d={goalPath}
            fill="none"
            stroke="#5E6B73"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.4}
          />
        )}

        {chainFeatures.map((f, i) => {
          const code = chainCodes[i];
          const isStart = i === 0;
          const isEnd = code === goalCode;

          return (
            <path
              key={String(f.id)}
              d={pathFn(f as Feature<Geometry>) || ""}
              fill={isEnd ? "#2E7D46" : isStart ? "#2E7D46" : "#B0BEC5"}
              fillOpacity={0.65}
              stroke={isStart ? "#2E7D46" : "#1B2A33"}
              strokeWidth={2}
              className="map-country"
            />
          );
        })}
      </svg>
    </div>
  );
}
