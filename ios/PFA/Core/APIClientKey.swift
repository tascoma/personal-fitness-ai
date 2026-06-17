import SwiftUI

/// Injects `APIClient` through the SwiftUI environment so views never construct
/// it directly and tests can swap in a stub.
private struct APIClientKey: EnvironmentKey {
    static let defaultValue = APIClient()
}

extension EnvironmentValues {
    var apiClient: APIClient {
        get { self[APIClientKey.self] }
        set { self[APIClientKey.self] = newValue }
    }
}
