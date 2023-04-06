// import Map from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import MapService from "../../services/mapService";
import { UPPER_COORDINATES, LOWER_COORDINATES } from "../../constants";
import "./index.css";

let DURATION_UPPER_COORDINATES = 0;
let DURATION_LOWER_COORDINATES = 0;

mapboxgl.accessToken = process.env.REACT_APP_MAP_API_ACCESS_TOKEN;

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(UPPER_COORDINATES[0].long);
  const [lat, setLat] = useState(UPPER_COORDINATES[0].latt);
  const [zoom, setZoom] = useState(9);
  const [longerRouteDuration, setLongerRouteDuration] = useState(0);
  const [routesTime, setRoutesTime] = useState([]);

  useEffect(() => {
    initMap();
    placeMapMarkers();
    onMapMove();
    onMapLoad();
  }, []);

  const initMap = () => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [lng, lat],
      zoom: zoom,
    });
  };

  const placeMapMarkers = () => {
    for (let index = 0; index < UPPER_COORDINATES.length; index++) {
      setMarker(
        UPPER_COORDINATES[index].latt,
        UPPER_COORDINATES[index].long,
        index
      );
    }

    for (let index = 0; index < LOWER_COORDINATES.length; index++) {
      setMarker(
        LOWER_COORDINATES[index].latt,
        LOWER_COORDINATES[index].long,
        index
      );
    }
  };

  const onMapMove = () => {
    if (!map.current) return; // wait for map to initialize

    map.current.on("move", () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });
  };

  const onMapLoad = () => {
    map.current.on("load", async () => {
      for (let i = 1; i < UPPER_COORDINATES.length; i++) {
        fetchDirections(UPPER_COORDINATES[i - 1], UPPER_COORDINATES[i]).then(
          (data) => {
            DURATION_UPPER_COORDINATES += data;
            setLongerRoute();
          }
        );
      }

      for (let i = 1; i < LOWER_COORDINATES.length; i++) {
        fetchDirections(LOWER_COORDINATES[i - 1], LOWER_COORDINATES[i]).then(
          (data) => {
            DURATION_LOWER_COORDINATES += data;
          }
        );
      }

      setLongerRoute();
    });
  };

  const fetchDirections = async (origin, destination) => {
    const { data, hasError, error } = await MapService.getRoute({
      startLong: origin.long,
      startLatt: origin.latt,
      endLong: destination.long,
      endLatt: destination.latt,
    });

    if (hasError) {
      console.error("error", error);
      return;
    }
    const uniqueID = data.uuid;
    const route = data.routes[0];
    const time = route.duration / 60;
    const cords = route.geometry.coordinates;

    setRoutesTime((prevVal) => [
      ...prevVal,
      { from: origin.name, to: destination.name, time: time.toFixed(2) },
    ]);
    const geojson = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: cords,
      },
    };

    addRouteLayer(map.current, uniqueID, geojson);

    return time;
  };

  const setMarker = (latt, long, index) => {
    if (index === 0) {
      new mapboxgl.Marker({ color: "black" })
        .setLngLat([long, latt])
        .addTo(map.current);
    } else new mapboxgl.Marker().setLngLat([long, latt]).addTo(map.current);
  };

  const addRouteLayer = (map, id, geojson) => {
    if (map.getSource("route" + id)) {
      map.getSource("route" + id).setData(geojson);
    } else {
      map.addLayer({
        id: "route" + id,
        type: "line",
        source: {
          type: "geojson",
          data: geojson,
        },
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#3887be",
          "line-width": 5,
          "line-opacity": 0.75,
        },
      });
      addArrowLayer(map, id);
    }
  };

  const addArrowLayer = (map, id) => {
    if (!map.getSource("routeArrows" + id)) {
      map.addLayer(
        {
          id: "routeArrows" + id,
          type: "symbol",
          source: "route" + id,
          layout: {
            "symbol-placement": "line",
            "text-field": "▶",
            "text-size": ["interpolate", ["linear"], ["zoom"], 12, 24, 22, 60],
            "symbol-spacing": [
              "interpolate",
              ["linear"],
              ["zoom"],
              12,
              30,
              22,
              160,
            ],
            "text-keep-upright": false,
          },
          paint: {
            "text-color": "#000",
            "text-halo-color": "hsl(55, 11%, 96%)",
            "text-halo-width": 3,
          },
        },
        "waterway-label"
      );
    }
  };

  const setLongerRoute = () => {
    const duration =
      DURATION_UPPER_COORDINATES > DURATION_LOWER_COORDINATES
        ? DURATION_UPPER_COORDINATES
        : DURATION_LOWER_COORDINATES;
    setLongerRouteDuration(duration.toFixed(2));
  };

  return (
    <div>
      <div className="sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
      <div
        ref={mapContainer}
        className="map-container"
        style={{ width: "100%", height: "700px" }}
      />
      <h4>
        Total driving time with one truck :{" "}
        {(DURATION_UPPER_COORDINATES + DURATION_LOWER_COORDINATES).toFixed(2)}{" "}
        minutes
      </h4>
      <h4>Longer route duration : {longerRouteDuration} minutes</h4>
      <div>
        {routesTime.map((item, index) => {
          return (
            <div
              key={index}
            >{`${index} From ${item?.from} to ${item.to} : ${item.time} Minutes`}</div>
          );
        })}
      </div>
    </div>
  );
};

export default Map;
