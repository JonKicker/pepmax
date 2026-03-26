/**
 * LocationManager (Watch-side)
 *
 * Singleton CLLocationManager wrapper for watch-independent GPS tracking.
 * Collects breadcrumbs during a cardio session and exposes them via getRoute().
 *
 * Accuracy filter: points with horizontalAccuracy > 50m are discarded
 * (matches the phone-side useCardioSession drift filter).
 *
 * Used exclusively by WatchCardioManager — do not subscribe from views.
 */
import CoreLocation
import Combine

class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {

  static let shared = LocationManager()

  @Published var currentLocation: CLLocation?
  @Published var isAuthorized: Bool = false

  private let manager = CLLocationManager()
  private var routePoints: [WatchCardioRoutePoint] = []
  private var lastAltitude: Double?

  // Accumulated elevation for the session (maintained externally by WatchCardioManager)
  private(set) var elevationGainAccum: Double = 0
  private(set) var elevationLossAccum: Double = 0

  private override init() {
    super.init()
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyBest
    manager.activityType = .fitness
    // Required to track when wrist is down during a workout
    manager.allowsBackgroundLocationUpdates = true
    manager.pausesLocationUpdatesAutomatically = false
  }

  // MARK: - Authorization

  func requestAuthorization() {
    manager.requestWhenInUseAuthorization()
  }

  // MARK: - Tracking

  /// Start a new session: clears existing route, then begins updates.
  func startTracking() {
    clearRoute()
    manager.startUpdatingLocation()
  }

  /// Resume after a pause: continues updates WITHOUT clearing the existing route.
  func resumeTracking() {
    manager.startUpdatingLocation()
  }

  func stopTracking() {
    manager.stopUpdatingLocation()
  }

  // MARK: - Route Access

  func getRoute() -> [WatchCardioRoutePoint] {
    return routePoints
  }

  func clearRoute() {
    routePoints = []
    lastAltitude = nil
    elevationGainAccum = 0
    elevationLossAccum = 0
  }

  // MARK: - CLLocationManagerDelegate

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else { return }

    // Discard inaccurate fixes — keep this guard before the dispatch to avoid
    // the overhead of a main-queue hop for every rejected point.
    guard location.horizontalAccuracy >= 0,
          location.horizontalAccuracy <= 50 else { return }

    // Dispatch all mutations to the main queue so that routePoints,
    // elevationGainAccum, elevationLossAccum, and lastAltitude are always
    // written and read on the same thread as the @Published properties.
    DispatchQueue.main.async {
      // Accumulate elevation
      let alt = location.altitude
      if let prev = self.lastAltitude {
        let delta = alt - prev
        if delta > 0 {
          self.elevationGainAccum += delta
        } else {
          self.elevationLossAccum += abs(delta)
        }
      }
      self.lastAltitude = alt

      let point = WatchCardioRoutePoint(
        latitude: location.coordinate.latitude,
        longitude: location.coordinate.longitude,
        altitude: alt,
        timestamp: location.timestamp.timeIntervalSince1970 * 1000,
        speed: location.speed >= 0 ? location.speed : nil,
        accuracy: location.horizontalAccuracy
      )
      self.routePoints.append(point)

      self.currentLocation = location
    }
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    DispatchQueue.main.async {
      switch manager.authorizationStatus {
      case .authorizedWhenInUse, .authorizedAlways:
        self.isAuthorized = true
      default:
        self.isAuthorized = false
      }
    }
  }
}
