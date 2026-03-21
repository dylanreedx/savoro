import Testing
import Foundation
@testable import Savoro

// MARK: - Helpers

private func makeUserJSON(id: String = "u1", username: String = "alice") -> String {
    """
    {
        "id": "\(id)",
        "email": "\(username)@example.com",
        "username": "\(username)",
        "display_name": "\(username.capitalized)",
        "is_public": true,
        "is_apple_private_email": false,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    }
    """
}

private func makeMemberJSON(
    id: String = "m1",
    userId: String = "u1",
    username: String = "alice",
    role: String = "owner",
    joinedAt: String = "2025-01-01T00:00:00Z"
) -> String {
    """
    {
        "id": "\(id)",
        "user": \(makeUserJSON(id: userId, username: username)),
        "role": "\(role)",
        "joined_at": "\(joinedAt)"
    }
    """
}

private func makeActivityJSON(
    id: String = "a1",
    actorName: String = "Sarah",
    verb: String = "added",
    recipeName: String = "Miso Salmon",
    timestamp: String = "2025-01-01T00:00:00Z"
) -> String {
    """
    {
        "id": "\(id)",
        "actor_name": "\(actorName)",
        "verb": "\(verb)",
        "recipe_name": "\(recipeName)",
        "timestamp": "\(timestamp)"
    }
    """
}

private func makeGroupJSON(
    id: String = "g1",
    name: String = "Sunday Kitchen",
    description: String? = "Shared recipes for the crew",
    memberCount: Int = 3,
    members: String = "[]",
    recipes: String = "[]",
    activities: String = "[]"
) -> String {
    let descField = description.map { #", "description": "\#($0)""# } ?? ""
    return """
    {
        "id": "\(id)",
        "name": "\(name)"\(descField),
        "member_count": \(memberCount),
        "members": \(members),
        "recipes": \(recipes),
        "activities": \(activities)
    }
    """
}

private func makeDecoder() -> JSONDecoder {
    let d = JSONDecoder()
    d.dateDecodingStrategy = .iso8601
    return d
}

private func makeEncoder() -> JSONEncoder {
    let e = JSONEncoder()
    e.dateEncodingStrategy = .iso8601
    return e
}

// MARK: - MemberRole Tests

@Suite("MemberRole")
struct MemberRoleTests {

    @Test("raw values match expected strings")
    func rawValues() {
        #expect(MemberRole.owner.rawValue == "owner")
        #expect(MemberRole.admin.rawValue == "admin")
        #expect(MemberRole.member.rawValue == "member")
    }

    @Test("decodes from raw string")
    func decodes() throws {
        let decoder = makeDecoder()
        let owner = try decoder.decode(MemberRole.self, from: Data("\"owner\"".utf8))
        let admin = try decoder.decode(MemberRole.self, from: Data("\"admin\"".utf8))
        let member = try decoder.decode(MemberRole.self, from: Data("\"member\"".utf8))
        #expect(owner == .owner)
        #expect(admin == .admin)
        #expect(member == .member)
    }

    @Test("round-trips through Codable")
    func roundTrip() throws {
        let encoder = makeEncoder()
        let decoder = makeDecoder()
        for role in [MemberRole.owner, .admin, .member] {
            let data = try encoder.encode(role)
            let decoded = try decoder.decode(MemberRole.self, from: data)
            #expect(decoded == role)
        }
    }

    @Test("unknown raw value returns nil")
    func unknownRawValue() {
        #expect(MemberRole(rawValue: "superadmin") == nil)
        #expect(MemberRole(rawValue: "") == nil)
    }
}

// MARK: - KitchenMember Tests

@Suite("KitchenMember")
struct KitchenMemberTests {

    @Test("init stores all properties")
    func initStoresProperties() {
        let user = User(
            id: "u1", email: "a@b.com", username: "alice",
            displayName: "Alice", bio: nil, avatarUrl: nil,
            isPublic: true, appleId: nil, isApplePrivateEmail: false,
            createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z"
        )
        let member = KitchenMember(id: "m1", user: user, role: .owner)
        #expect(member.id == "m1")
        #expect(member.user.id == "u1")
        #expect(member.role == .owner)
        #expect(member.joinedAt == "2025-01-01T00:00:00Z")
    }

    @Test("init accepts custom joinedAt")
    func initCustomJoinedAt() {
        let user = User(
            id: "u2", email: "b@c.com", username: "bob",
            displayName: "Bob", bio: nil, avatarUrl: nil,
            isPublic: true, appleId: nil, isApplePrivateEmail: false,
            createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z"
        )
        let member = KitchenMember(id: "m2", user: user, role: .admin, joinedAt: "2025-06-01T00:00:00Z")
        #expect(member.joinedAt == "2025-06-01T00:00:00Z")
        #expect(member.role == .admin)
    }

    @Test("decodes from JSON with snake_case keys")
    func decodesFromJSON() throws {
        let json = makeMemberJSON(id: "m1", userId: "u1", username: "alice", role: "owner")
        let data = Data(json.utf8)
        let member = try makeDecoder().decode(KitchenMember.self, from: data)
        #expect(member.id == "m1")
        #expect(member.role == .owner)
        #expect(member.user.username == "alice")
        #expect(member.joinedAt == "2025-01-01T00:00:00Z")
    }

    @Test("round-trips through Codable")
    func roundTrip() throws {
        let json = makeMemberJSON(id: "m2", userId: "u2", username: "bob", role: "admin")
        let data = Data(json.utf8)
        let decoder = makeDecoder()
        let encoder = makeEncoder()
        let original = try decoder.decode(KitchenMember.self, from: data)
        let reencoded = try encoder.encode(original)
        let decoded = try decoder.decode(KitchenMember.self, from: reencoded)
        #expect(decoded.id == original.id)
        #expect(decoded.role == original.role)
        #expect(decoded.user.id == original.user.id)
        #expect(decoded.joinedAt == original.joinedAt)
    }

    @Test("all three roles decode correctly")
    func allRolesDecode() throws {
        let decoder = makeDecoder()
        for (rawRole, expected) in [("owner", MemberRole.owner), ("admin", .admin), ("member", .member)] {
            let json = makeMemberJSON(id: "mx", userId: "ux", username: "user", role: rawRole)
            let member = try decoder.decode(KitchenMember.self, from: Data(json.utf8))
            #expect(member.role == expected)
        }
    }
}

// MARK: - KitchenActivity Tests

@Suite("KitchenActivity")
struct KitchenActivityTests {

    @Test("init stores all properties with default timestamp")
    func initStoresProperties() {
        let before = Date()
        let activity = KitchenActivity(id: "a1", actorName: "Sarah", verb: "added", recipeName: "Miso Salmon")
        let after = Date()
        #expect(activity.id == "a1")
        #expect(activity.actorName == "Sarah")
        #expect(activity.verb == "added")
        #expect(activity.recipeName == "Miso Salmon")
        #expect(activity.timestamp >= before)
        #expect(activity.timestamp <= after)
    }

    @Test("init accepts custom timestamp")
    func initCustomTimestamp() {
        let ts = Date(timeIntervalSince1970: 1_000_000)
        let activity = KitchenActivity(id: "a2", actorName: "Bob", verb: "forked", recipeName: "Bowl", timestamp: ts)
        #expect(activity.timestamp == ts)
    }

    @Test("decodes from JSON with snake_case keys")
    func decodesFromJSON() throws {
        let json = makeActivityJSON(
            id: "a1", actorName: "Sarah", verb: "added",
            recipeName: "Miso Salmon", timestamp: "2025-01-01T00:00:00Z"
        )
        let activity = try makeDecoder().decode(KitchenActivity.self, from: Data(json.utf8))
        #expect(activity.id == "a1")
        #expect(activity.actorName == "Sarah")
        #expect(activity.verb == "added")
        #expect(activity.recipeName == "Miso Salmon")
    }

    @Test("round-trips timestamp through Codable")
    func roundTripTimestamp() throws {
        let ts = Date(timeIntervalSince1970: 1_700_000_000)
        let original = KitchenActivity(id: "a3", actorName: "Alice", verb: "added", recipeName: "Oats", timestamp: ts)
        let encoder = makeEncoder()
        let decoder = makeDecoder()
        let data = try encoder.encode(original)
        let decoded = try decoder.decode(KitchenActivity.self, from: data)
        #expect(decoded.id == original.id)
        #expect(decoded.actorName == original.actorName)
        #expect(decoded.verb == original.verb)
        #expect(decoded.recipeName == original.recipeName)
        // Allow 1s tolerance for ISO8601 rounding
        #expect(abs(decoded.timestamp.timeIntervalSince(original.timestamp)) < 1.0)
    }
}

// MARK: - KitchenGroup Tests

@Suite("KitchenGroup")
struct KitchenGroupTests {

    @Test("init stores all properties with defaults")
    func initDefaults() {
        let group = KitchenGroup(id: "g1", name: "Sunday Kitchen", memberCount: 0)
        #expect(group.id == "g1")
        #expect(group.name == "Sunday Kitchen")
        #expect(group.description == nil)
        #expect(group.memberCount == 0)
        #expect(group.members.isEmpty)
        #expect(group.recipes.isEmpty)
        #expect(group.activities.isEmpty)
    }

    @Test("init stores optional description")
    func initWithDescription() {
        let group = KitchenGroup(id: "g2", name: "Test", description: "A group", memberCount: 1)
        #expect(group.description == "A group")
    }

    @Test("decodes from JSON with snake_case keys")
    func decodesFromJSON() throws {
        let json = makeGroupJSON(
            id: "g1", name: "Sunday Kitchen",
            description: "Shared recipes for the crew",
            memberCount: 3
        )
        let group = try makeDecoder().decode(KitchenGroup.self, from: Data(json.utf8))
        #expect(group.id == "g1")
        #expect(group.name == "Sunday Kitchen")
        #expect(group.description == "Shared recipes for the crew")
        #expect(group.memberCount == 3)
        #expect(group.members.isEmpty)
        #expect(group.recipes.isEmpty)
        #expect(group.activities.isEmpty)
    }

    @Test("decodes with null description")
    func decodesNullDescription() throws {
        let json = makeGroupJSON(id: "g2", name: "No Desc", description: nil, memberCount: 0)
        let group = try makeDecoder().decode(KitchenGroup.self, from: Data(json.utf8))
        #expect(group.description == nil)
    }

    @Test("decodes with nested members")
    func decodesWithMembers() throws {
        let member = makeMemberJSON(id: "m1", userId: "u1", username: "alice", role: "owner")
        let membersJSON = "[\(member)]"
        let json = makeGroupJSON(id: "g1", name: "Kitchen", memberCount: 1, members: membersJSON)
        let group = try makeDecoder().decode(KitchenGroup.self, from: Data(json.utf8))
        #expect(group.members.count == 1)
        #expect(group.members[0].id == "m1")
        #expect(group.members[0].role == .owner)
    }

    @Test("decodes with nested activities")
    func decodesWithActivities() throws {
        let activity = makeActivityJSON(id: "a1", actorName: "Sarah", verb: "added", recipeName: "Miso Salmon", timestamp: "2025-01-01T00:00:00Z")
        let activitiesJSON = "[\(activity)]"
        let json = makeGroupJSON(id: "g1", name: "Kitchen", memberCount: 1, activities: activitiesJSON)
        let group = try makeDecoder().decode(KitchenGroup.self, from: Data(json.utf8))
        #expect(group.activities.count == 1)
        #expect(group.activities[0].actorName == "Sarah")
        #expect(group.activities[0].recipeName == "Miso Salmon")
    }

    @Test("round-trips through Codable")
    func roundTrip() throws {
        let json = makeGroupJSON(
            id: "g99", name: "Round Trip Kitchen",
            description: "Test desc", memberCount: 5
        )
        let decoder = makeDecoder()
        let encoder = makeEncoder()
        let original = try decoder.decode(KitchenGroup.self, from: Data(json.utf8))
        let reencoded = try encoder.encode(original)
        let decoded = try decoder.decode(KitchenGroup.self, from: reencoded)
        #expect(decoded.id == original.id)
        #expect(decoded.name == original.name)
        #expect(decoded.description == original.description)
        #expect(decoded.memberCount == original.memberCount)
    }
}

// MARK: - KitchenGroup Preview Data Tests

@Suite("KitchenGroup.preview")
struct KitchenGroupPreviewTests {

    @Test("preview has expected id and name")
    func previewIdentity() {
        let preview = KitchenGroup.preview
        #expect(preview.id == "g1")
        #expect(preview.name == "Sunday Kitchen")
    }

    @Test("preview description is non-nil")
    func previewDescription() {
        #expect(KitchenGroup.preview.description != nil)
        #expect(!(KitchenGroup.preview.description?.isEmpty ?? true))
    }

    @Test("preview has exactly 3 members")
    func previewMemberCount() {
        #expect(KitchenGroup.preview.members.count == 3)
        #expect(KitchenGroup.preview.memberCount == 3)
    }

    @Test("preview members have correct roles")
    func previewMemberRoles() {
        let members = KitchenGroup.preview.members
        #expect(members[0].role == .owner)
        #expect(members[1].role == .admin)
        #expect(members[2].role == .member)
    }

    @Test("preview members have expected usernames")
    func previewMemberUsernames() {
        let usernames = KitchenGroup.preview.members.map(\.user.username)
        #expect(usernames.contains("alice"))
        #expect(usernames.contains("bob"))
        #expect(usernames.contains("sarah"))
    }

    @Test("preview has exactly 3 activities")
    func previewActivityCount() {
        #expect(KitchenGroup.preview.activities.count == 3)
    }

    @Test("first preview activity matches Miso Salmon story")
    func previewFirstActivity() {
        let first = KitchenGroup.preview.activities[0]
        #expect(first.actorName == "Sarah")
        #expect(first.verb == "added")
        #expect(first.recipeName == "Miso Salmon")
    }

    @Test("preview activities have unique ids")
    func previewActivityIds() {
        let ids = KitchenGroup.preview.activities.map(\.id)
        #expect(Set(ids).count == ids.count)
    }

    @Test("preview activities are ordered most-recent first")
    func previewActivityOrder() {
        let activities = KitchenGroup.preview.activities
        for i in 0..<(activities.count - 1) {
            #expect(activities[i].timestamp >= activities[i + 1].timestamp)
        }
    }

    @Test("preview has non-empty recipes list")
    func previewRecipes() {
        #expect(!KitchenGroup.preview.recipes.isEmpty)
    }

    @Test("preview is Sendable (compiles with concurrency check)")
    func previewIsSendable() async {
        let preview = KitchenGroup.preview
        await Task.detached {
            _ = preview.id
        }.value
    }
}
