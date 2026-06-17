import Foundation

@MainActor
final class HistoryViewModel: ObservableObject {
    @Published var sessions: [WorkoutSession] = []
    @Published var search = ""
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        var path = "/api/sessions?limit=100"
        let q = search.trimmingCharacters(in: .whitespaces)
        if !q.isEmpty,
           let encoded = q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            path += "&q=\(encoded)"
        }
        do {
            sessions = try await client.get(path)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
