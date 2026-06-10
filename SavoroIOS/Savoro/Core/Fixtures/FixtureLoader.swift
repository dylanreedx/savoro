import Foundation

enum FixtureLoader {
    static func data(named name: String, bundle: Bundle = .main) throws -> Data {
        let resourceName = name.hasSuffix(".json") ? String(name.dropLast(5)) : name
        guard let url = bundle.url(forResource: resourceName, withExtension: "json") else {
            throw FixtureLoaderError.missingFixture(name)
        }

        return try Data(contentsOf: url)
    }

    static func decode<T: Decodable>(
        _ type: T.Type,
        named name: String,
        bundle: Bundle = .main,
        decoder: JSONDecoder = .savoro
    ) throws -> T {
        let data = try data(named: name, bundle: bundle)
        return try decoder.decode(T.self, from: data)
    }
}

enum FixtureLoaderError: LocalizedError, Equatable {
    case missingFixture(String)

    var errorDescription: String? {
        switch self {
        case .missingFixture(let name):
            return "Missing JSON fixture named \(name)."
        }
    }
}

extension JSONDecoder {
    static var savoro: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}

extension JSONEncoder {
    static var savoro: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}
