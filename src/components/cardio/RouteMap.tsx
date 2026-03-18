import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import type { RoutePoint, DistanceUnit } from '../../types/cardio';
import { getRouteBounds, buildPaceSegments, getMileMarkers } from '../../utils/cardio';

type Props = {
  route: RoutePoint[];
  averagePace: number;
  interactive?: boolean;
  distanceUnit?: DistanceUnit;
  style?: ViewStyle;
};

export default function RouteMap({
  route,
  averagePace,
  interactive = false,
  distanceUnit = 'mi',
  style,
}: Props) {
  const { colors } = useTheme();

  const region = useMemo(() => getRouteBounds(route), [route]);
  const segments = useMemo(
    () => (interactive ? buildPaceSegments(route, averagePace) : []),
    [route, averagePace, interactive]
  );
  const markers = useMemo(
    () => (interactive ? getMileMarkers(route, distanceUnit === 'mi' ? 1609.344 : 1000) : []),
    [route, distanceUnit, interactive]
  );

  const simpleCoords = useMemo(
    () => route.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
    [route]
  );

  if (route.length < 2) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>No route data</Text>
      </View>
    );
  }

  return (
    <MapView
      style={[styles.map, style]}
      initialRegion={region}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      pitchEnabled={false}
      rotateEnabled={false}
      showsUserLocation={false}
      showsPointsOfInterest={false}
      showsBuildings={false}
      liteMode={!interactive}
    >
      {/* Pace-colored segments for interactive, simple polyline for thumbnail */}
      {interactive ? (
        segments.map((seg, i) => (
          <Polyline
            key={i}
            coordinates={seg.coordinates}
            strokeColor={seg.color}
            strokeWidth={4}
          />
        ))
      ) : (
        <Polyline
          coordinates={simpleCoords}
          strokeColor={Colors.cardio}
          strokeWidth={3}
        />
      )}

      {/* Start and end pins */}
      {interactive && (
        <>
          <Marker
            coordinate={simpleCoords[0]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.pin, { backgroundColor: '#27AE60' }]}>
              <Text style={styles.pinText}>S</Text>
            </View>
          </Marker>
          <Marker
            coordinate={simpleCoords[simpleCoords.length - 1]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.pin, { backgroundColor: Colors.cardio }]}>
              <Text style={styles.pinText}>F</Text>
            </View>
          </Marker>
        </>
      )}

      {/* Mile/km markers */}
      {interactive && markers.map((m) => (
        <Marker
          key={m.label}
          coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.mileMarker}>
            <Text style={styles.mileMarkerText}>{m.label}</Text>
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 200, borderRadius: 12, overflow: 'hidden' },
  placeholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 13 },
  pin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  pinText: { color: 'white', fontSize: 11, fontWeight: '800' },
  mileMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  mileMarkerText: { color: 'white', fontSize: 9, fontWeight: '700' },
});
