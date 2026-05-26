import Foundation
import Observation

/// Drives the album page (build spec F6).
@MainActor
@Observable
final class AlbumDetailViewModel {
    enum State: Equatable {
        case loading
        case loaded(AlbumDetail)
        case error(String)
    }

    private(set) var state: State = .loading

    let albumID: UUID
    private let api: AlbumsAPI

    init(albumID: UUID, api: AlbumsAPI) {
        self.albumID = albumID
        self.api = api
    }

    func load() async {
        if case .loaded = state {
            // Don't blank a populated page on a manual refresh.
        } else {
            state = .loading
        }
        do {
            let detail = try await api.detail(id: albumID)
            state = .loaded(detail)
        } catch {
            if case .loaded = state { return }
            state = .error((error as? LocalizedError)?.errorDescription
                           ?? "Couldn't load this album. Try again shortly.")
        }
    }
}
