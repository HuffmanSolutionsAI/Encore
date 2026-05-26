import Foundation
import Observation

/// Drives the home/now-playing screen. Polls `GET /now-playing` every
/// ~25s while the view is visible and the scene is active.
///
/// `state` is what the view renders. A transient network blip never
/// blanks the screen — when we already have a track and a poll fails,
/// we keep the prior track on screen and only surface the error if we
/// have nothing better to show.
@MainActor
@Observable
final class NowPlayingViewModel {
    enum State: Equatable {
        case loading
        case playing(NowPlayingTrack)
        case nothingPlaying
        case lastfmNotLinked
        case error(String)
    }

    private(set) var state: State = .loading

    /// Time between polls while the screen is visible. The build spec
    /// targets 20–30s.
    private let pollInterval: Duration

    private let api: NowPlayingAPI
    private var pollTask: Task<Void, Never>?

    init(api: NowPlayingAPI, pollInterval: Duration = .seconds(25)) {
        self.api = api
        self.pollInterval = pollInterval
    }

    deinit {
        pollTask?.cancel()
    }

    /// Begin polling. Safe to call repeatedly — a running loop is reused.
    func start() {
        guard pollTask == nil else { return }
        let interval = pollInterval
        pollTask = Task { [weak self] in
            await self?.refresh()
            while !Task.isCancelled {
                do {
                    try await Task.sleep(for: interval)
                } catch {
                    return
                }
                if Task.isCancelled { return }
                await self?.refresh()
            }
        }
    }

    /// Stop polling (e.g. the scene moved to the background).
    func stop() {
        pollTask?.cancel()
        pollTask = nil
    }

    /// Force a one-shot refresh — used by pull-to-refresh.
    func refresh() async {
        do {
            let track = try await api.current()
            state = track.map(State.playing) ?? .nothingPlaying
        } catch APIError.conflict(let code, _) where code == "lastfm_not_linked" {
            state = .lastfmNotLinked
        } catch APIError.transport {
            // A transient blip should never blank a previously-good screen.
            // Only surface the error when we have nothing else to show.
            if !hasUsableState {
                state = .error("We've lost the signal for a moment. Your ratings are safe — try again shortly.")
            }
        } catch {
            if !hasUsableState {
                state = .error((error as? LocalizedError)?.errorDescription
                               ?? "Something went wrong. Try again shortly.")
            }
        }
    }

    private var hasUsableState: Bool {
        switch state {
        case .playing, .nothingPlaying, .lastfmNotLinked: true
        case .loading, .error: false
        }
    }
}
