import Foundation
import Security

/// Thin wrapper around the Security keychain used to persist auth tokens.
/// Stores a single JSON-encoded `AuthTokens` blob keyed by service + account.
struct KeychainStore {
    let service: String
    let account: String

    static let authTokens = KeychainStore(service: "com.encore.auth", account: "tokens")

    func save(_ tokens: AuthTokens) throws {
        let data = try JSONEncoder.iso8601.encode(tokens)
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]

        let status = SecItemCopyMatching(query as CFDictionary, nil)
        if status == errSecSuccess {
            let attrs: [String: Any] = [kSecValueData as String: data]
            let updateStatus = SecItemUpdate(query as CFDictionary, attrs as CFDictionary)
            guard updateStatus == errSecSuccess else {
                throw KeychainError.unhandled(updateStatus)
            }
        } else if status == errSecItemNotFound {
            query[kSecValueData as String] = data
            query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            let addStatus = SecItemAdd(query as CFDictionary, nil)
            guard addStatus == errSecSuccess else {
                throw KeychainError.unhandled(addStatus)
            }
        } else {
            throw KeychainError.unhandled(status)
        }
    }

    func load() throws -> AuthTokens? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data else {
            throw KeychainError.unhandled(status)
        }
        return try JSONDecoder.iso8601.decode(AuthTokens.self, from: data)
    }

    func delete() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unhandled(status)
        }
    }
}

enum KeychainError: Error {
    case unhandled(OSStatus)
}

extension JSONEncoder {
    static let iso8601: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()
}

extension JSONDecoder {
    static let iso8601: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()
}
