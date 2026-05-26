import Foundation
import Observation

/// Drives the library screen — pulls the signed-in user's ratings and
/// exposes a simple state machine for the view.
///
/// M3 keeps this minimal (load + display). Searching, filtering, and
/// sorting are the M5 deliverable.
@MainActor
@Observable
final class LibraryViewModel {
    enum State: Equatable {
        case loading
        case loaded([LibraryEntry])
        case error(String)
    }

    private(set) var state: State = .loading

    private let api: RatingsAPI

    init(api: RatingsAPI) {
        self.api = api
    }

    func load() async {
        if case .loaded = state {
            // A reload that's not the first should not blank the screen.
        } else {
            state = .loading
        }

        do {
            let entries = try await api.mine()
            state = .loaded(entries)
        } catch {
            // Don't replace a good list on a transient blip.
            if case .loaded = state { return }
            state = .error((error as? LocalizedError)?.errorDescription
                           ?? "Couldn't load your library. Try again shortly.")
        }
    }
}
