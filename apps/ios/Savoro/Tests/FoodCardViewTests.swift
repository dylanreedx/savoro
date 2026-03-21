import Testing
import Foundation
@testable import Savoro

// MARK: - FoodCardServing Codable Tests

@Suite("FoodCardServing")
struct FoodCardServingTests {

    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    @Test("decodes all fields when present")
    func decodesAllFields() throws {
        let json = """
        {
            "id": "s1",
            "description": "1 cup (240ml)",
            "calories": 150.0,
            "protein": 8.0,
            "carb": 12.0,
            "fat": 5.0
        }
        """.data(using: .utf8)!
        let serving = try decoder.decode(FoodCardServing.self, from: json)
        #expect(serving.id == "s1")
        #expect(serving.description == "1 cup (240ml)")
        #expect(serving.calories == 150.0)
        #expect(serving.protein == 8.0)
        #expect(serving.carb == 12.0)
        #expect(serving.fat == 5.0)
    }

    @Test("decodes with optional macro fields absent")
    func decodesWithoutOptionalMacros() throws {
        let json = """
        {
            "id": "s2",
            "description": "1 serving"
        }
        """.data(using: .utf8)!
        let serving = try decoder.decode(FoodCardServing.self, from: json)
        #expect(serving.id == "s2")
        #expect(serving.description == "1 serving")
        #expect(serving.calories == nil)
        #expect(serving.protein == nil)
        #expect(serving.carb == nil)
        #expect(serving.fat == nil)
    }

    @Test("round-trips via encode then decode")
    func roundTrip() throws {
        let original = FoodCardServing(
            id: "srv-abc",
            description: "100g",
            calories: 200.0,
            protein: 20.0,
            carb: 10.0,
            fat: 8.0
        )
        let data = try encoder.encode(original)
        let decoded = try decoder.decode(FoodCardServing.self, from: data)
        #expect(decoded == original)
    }

    @Test("equality holds for identical values")
    func equatable() {
        let a = FoodCardServing(id: "x", description: "desc", calories: 100, protein: 10, carb: 5, fat: 3)
        let b = FoodCardServing(id: "x", description: "desc", calories: 100, protein: 10, carb: 5, fat: 3)
        #expect(a == b)
    }

    @Test("inequality when id differs")
    func inequalityOnId() {
        let a = FoodCardServing(id: "x", description: "desc", calories: nil, protein: nil, carb: nil, fat: nil)
        let b = FoodCardServing(id: "y", description: "desc", calories: nil, protein: nil, carb: nil, fat: nil)
        #expect(a != b)
    }
}

// MARK: - FoodCardProps Codable Tests

@Suite("FoodCardProps")
struct FoodCardPropsTests {

    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    // Minimal v1-style JSON without v2 fields (source, servings, selected_serving_id)
    private let legacyJSON = """
    {
        "food_id": "food-001",
        "name": "Greek Yogurt",
        "serving_id": "sv-1",
        "serving_description": "1 cup",
        "calories": 130.0,
        "protein": 22.0,
        "carb": 9.0,
        "fat": 0.0,
        "quantity": 1.0
    }
    """.data(using: .utf8)!

    // Full v2 JSON with all new fields
    private let fullV2JSON = """
    {
        "food_id": "food-002",
        "name": "Oat Milk",
        "brand_name": "Oatly",
        "serving_id": "sv-2",
        "serving_description": "1 cup (240ml)",
        "calories": 120.0,
        "protein": 3.0,
        "carb": 16.0,
        "fat": 5.0,
        "quantity": 2.0,
        "source": "off",
        "servings": [
            {
                "id": "sv-2",
                "description": "1 cup (240ml)",
                "calories": 120.0,
                "protein": 3.0,
                "carb": 16.0,
                "fat": 5.0
            },
            {
                "id": "sv-3",
                "description": "100ml",
                "calories": 50.0,
                "protein": 1.25,
                "carb": 6.67,
                "fat": 2.08
            }
        ],
        "selected_serving_id": "sv-2"
    }
    """.data(using: .utf8)!

    // MARK: Backward compatibility

    @Test("backward compat: legacy JSON without v2 fields applies defaults")
    func legacyDecodesWithDefaults() throws {
        let props = try decoder.decode(FoodCardProps.self, from: legacyJSON)
        #expect(props.foodId == "food-001")
        #expect(props.name == "Greek Yogurt")
        #expect(props.source == .usda)       // default
        #expect(props.servings.isEmpty)       // default []
        #expect(props.selectedServingId == "") // default ""
        #expect(props.quantity == 1.0)
    }

    @Test("backward compat: brandName absent decodes as nil")
    func legacyBrandNameNil() throws {
        let props = try decoder.decode(FoodCardProps.self, from: legacyJSON)
        #expect(props.brandName == nil)
    }

    // MARK: Full v2 decode

    @Test("v2: decodes source field correctly")
    func decodesSource() throws {
        let props = try decoder.decode(FoodCardProps.self, from: fullV2JSON)
        #expect(props.source == .off)
    }

    @Test("v2: decodes servings array with two entries")
    func decodesServingsArray() throws {
        let props = try decoder.decode(FoodCardProps.self, from: fullV2JSON)
        #expect(props.servings.count == 2)
        #expect(props.servings[0].id == "sv-2")
        #expect(props.servings[1].id == "sv-3")
    }

    @Test("v2: decodes selected_serving_id")
    func decodesSelectedServingId() throws {
        let props = try decoder.decode(FoodCardProps.self, from: fullV2JSON)
        #expect(props.selectedServingId == "sv-2")
    }

    @Test("v2: decodes brand_name")
    func decodesBrandName() throws {
        let props = try decoder.decode(FoodCardProps.self, from: fullV2JSON)
        #expect(props.brandName == "Oatly")
    }

    @Test("v2: decodes quantity as 2.0")
    func decodesQuantity() throws {
        let props = try decoder.decode(FoodCardProps.self, from: fullV2JSON)
        #expect(props.quantity == 2.0)
    }

    // MARK: Defaults via memberwise init

    @Test("init defaults: source is .usda")
    func initDefaultSource() {
        let props = FoodCardProps(
            foodId: "f", name: "Food", servingId: "s", servingDescription: "1x"
        )
        #expect(props.source == .usda)
    }

    @Test("init defaults: servings is empty")
    func initDefaultServings() {
        let props = FoodCardProps(
            foodId: "f", name: "Food", servingId: "s", servingDescription: "1x"
        )
        #expect(props.servings.isEmpty)
    }

    @Test("init defaults: selectedServingId is empty string")
    func initDefaultSelectedServingId() {
        let props = FoodCardProps(
            foodId: "f", name: "Food", servingId: "s", servingDescription: "1x"
        )
        #expect(props.selectedServingId == "")
    }

    @Test("init defaults: quantity is 1.0")
    func initDefaultQuantity() {
        let props = FoodCardProps(
            foodId: "f", name: "Food", servingId: "s", servingDescription: "1x"
        )
        #expect(props.quantity == 1.0)
    }

    // MARK: All FoodSource raw values

    @Test("FoodSource.off decodes from string 'off'")
    func sourceOffDecodes() throws {
        let json = #"{"food_id":"f","name":"n","serving_id":"s","serving_description":"d","quantity":1,"source":"off","selected_serving_id":""}"#.data(using: .utf8)!
        let props = try decoder.decode(FoodCardProps.self, from: json)
        #expect(props.source == .off)
    }

    @Test("FoodSource.user decodes from string 'user'")
    func sourceUserDecodes() throws {
        let json = #"{"food_id":"f","name":"n","serving_id":"s","serving_description":"d","quantity":1,"source":"user","selected_serving_id":""}"#.data(using: .utf8)!
        let props = try decoder.decode(FoodCardProps.self, from: json)
        #expect(props.source == .user)
    }

    @Test("FoodSource.recipe decodes from string 'recipe'")
    func sourceRecipeDecodes() throws {
        let json = #"{"food_id":"f","name":"n","serving_id":"s","serving_description":"d","quantity":1,"source":"recipe","selected_serving_id":""}"#.data(using: .utf8)!
        let props = try decoder.decode(FoodCardProps.self, from: json)
        #expect(props.source == .recipe)
    }

    // MARK: Round-trip

    @Test("round-trip: encode then decode preserves all v2 fields")
    func roundTripV2() throws {
        let props = try decoder.decode(FoodCardProps.self, from: fullV2JSON)
        let data = try encoder.encode(props)
        let decoded = try decoder.decode(FoodCardProps.self, from: data)
        #expect(decoded == props)
    }

    // MARK: Edge cases

    @Test("empty servings array decodes correctly")
    func emptyServingsArray() throws {
        let json = """
        {
            "food_id": "f",
            "name": "n",
            "serving_id": "s",
            "serving_description": "d",
            "source": "usda",
            "servings": [],
            "selected_serving_id": ""
        }
        """.data(using: .utf8)!
        let props = try decoder.decode(FoodCardProps.self, from: json)
        #expect(props.servings.isEmpty)
    }

    @Test("serving with partial macros (only calories) decodes")
    func servingPartialMacros() throws {
        let json = """
        {
            "food_id": "f",
            "name": "n",
            "serving_id": "s",
            "serving_description": "d",
            "source": "usda",
            "servings": [{"id":"s1","description":"1 piece","calories":90.0}],
            "selected_serving_id": "s1"
        }
        """.data(using: .utf8)!
        let props = try decoder.decode(FoodCardProps.self, from: json)
        #expect(props.servings.count == 1)
        #expect(props.servings[0].calories == 90.0)
        #expect(props.servings[0].protein == nil)
        #expect(props.servings[0].carb == nil)
        #expect(props.servings[0].fat == nil)
    }

    @Test("UIComponent wrapping FoodCardProps decodes correctly")
    func uiComponentFoodCardDecode() throws {
        let json = """
        {
            "type": "food_card",
            "props": {
                "food_id": "food-003",
                "name": "Banana",
                "serving_id": "sv-10",
                "serving_description": "1 medium",
                "calories": 105.0,
                "protein": 1.3,
                "carb": 27.0,
                "fat": 0.4,
                "source": "usda",
                "servings": [],
                "selected_serving_id": "sv-10"
            }
        }
        """.data(using: .utf8)!
        let component = try decoder.decode(UIComponent.self, from: json)
        #expect(component.type == .foodCard)
        if case .foodCard(let props) = component.props {
            #expect(props.name == "Banana")
            #expect(props.source == .usda)
            #expect(props.selectedServingId == "sv-10")
        } else {
            Issue.record("Expected .foodCard props, got \(component.props)")
        }
    }
}
