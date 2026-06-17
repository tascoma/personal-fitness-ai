import SwiftUI

/// Shared, app-wide state: the read-only user settings (for the display unit)
/// loaded once at launch, plus a "data changed" tick that screens observe to
/// refresh after a new workout is logged.
@MainActor
final class AppState: ObservableObject {
    @Published var settings: UserSettings?
    /// Bumped whenever workout data changes so dependent screens reload.
    @Published var dataVersion: Int = 0

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    var unit: String { settings?.unit ?? "lbs" }

    func loadSettings() async {
        settings = try? await client.get("/api/settings")
    }

    func dataDidChange() {
        dataVersion &+= 1
    }
}
