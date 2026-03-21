import SwiftUI

struct RecipeEditorView: View {
    enum EditorMode {
        case create
        case edit(Recipe)
    }

    let mode: EditorMode
    let viewModel: CookbookViewModel

    @Environment(\.dismiss) private var dismiss

    @State private var title: String
    @State private var description: String
    @State private var instructions: String
    @State private var servings: Int
    @State private var prepTime: String
    @State private var cookTime: String
    @State private var isPublic: Bool
    @State private var selectedTags: Set<RecipeTag>
    @State private var ingredientDrafts: [RecipeIngredientDraft]

    @State private var isSaving = false
    @State private var isLoadingIngredients = false
    @State private var errorMessage: String?

    // foodId -> [ServingSummary] cache used to hydrate ingredient macros
    @State private var macroServingsCache: [String: [ServingSummary]] = [:]

    init(mode: EditorMode, viewModel: CookbookViewModel) {
        self.mode = mode
        self.viewModel = viewModel

        switch mode {
        case .create:
            _title = State(initialValue: "")
            _description = State(initialValue: "")
            _instructions = State(initialValue: "")
            _servings = State(initialValue: 1)
            _prepTime = State(initialValue: "")
            _cookTime = State(initialValue: "")
            _isPublic = State(initialValue: true)
            _selectedTags = State(initialValue: [])
            _ingredientDrafts = State(initialValue: [RecipeIngredientDraft(label: "")])
        case .edit(let recipe):
            _title = State(initialValue: recipe.title)
            _description = State(initialValue: recipe.description ?? "")
            _instructions = State(initialValue: recipe.instructions ?? "")
            _servings = State(initialValue: recipe.servings)
            _prepTime = State(initialValue: recipe.prepTime.map(String.init) ?? "")
            _cookTime = State(initialValue: recipe.cookTime.map(String.init) ?? "")
            _isPublic = State(initialValue: recipe.isPublic)
            _selectedTags = State(initialValue: Set(recipe.tags.compactMap { RecipeTag(rawValue: $0) }))
            _ingredientDrafts = State(initialValue: [])
        }
    }

    private var navigationTitle: String {
        switch mode {
        case .create: return "New Recipe"
        case .edit:   return "Edit Recipe"
        }
    }

    /// Per-serving macros summed from ingredients with cached macro data, or nil when servings==0.
    private var livePerServingMacros: (protein: Double, carb: Double, fat: Double)? {
        RecipeIngredientDraft.calculatePerServingMacros(
            ingredients: ingredientDrafts,
            servings: servings
        )
    }

    /// True when at least one linked ingredient is missing cached macros (free-text or failed fetch).
    private var hasMacroGaps: Bool {
        ingredientDrafts.contains { draft in
            guard !draft.label.trimmingCharacters(in: .whitespaces).isEmpty,
                  draft.foodId != nil else { return false }
            return draft.cachedProtein == nil
        }
    }

    var body: some View {
        Form {
            detailsSection
            ingredientsSection
            macroPreviewSection
            instructionsSection
            settingsSection

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .font(SavoroFonts.caption)
                        .foregroundStyle(.red)
                }
            }
        }
        .navigationTitle(navigationTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    Task { await save() }
                }
                .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
                .fontWeight(.semibold)
            }
        }
        .interactiveDismissDisabled(isSaving)
        .task {
            guard case .edit(let recipe) = mode else { return }
            isLoadingIngredients = true
            do {
                let loaded = try await viewModel.loadIngredients(for: recipe.id)
                let drafts = loaded
                    .sorted { $0.sortOrder < $1.sortOrder }
                    .map { ing in
                        RecipeIngredientDraft(
                            label: ing.label,
                            quantity: ing.quantity,
                            unit: ing.unit,
                            foodId: ing.foodId,
                            servingId: ing.servingId
                        )
                    }
                ingredientDrafts = drafts + [RecipeIngredientDraft(label: "")]
            } catch {
                ingredientDrafts = [RecipeIngredientDraft(label: "")]
            }
            isLoadingIngredients = false
            await hydrateIngredientMacros()
        }
        .onChange(of: ingredientDrafts) { _, _ in
            Task { await hydrateIngredientMacros() }
        }
    }

    // MARK: - Sections

    private var detailsSection: some View {
        Section("Details") {
            TextField("Title", text: $title)
                .font(SavoroFonts.body)

            TextField("Description (optional)", text: $description, axis: .vertical)
                .font(SavoroFonts.body)
                .lineLimit(3...6)

            Stepper("Servings: \(servings)", value: $servings, in: 1...99)
                .font(SavoroFonts.body)

            HStack {
                TextField("Prep (min)", text: $prepTime)
                    .keyboardType(.numberPad)
                    .font(SavoroFonts.body)

                TextField("Cook (min)", text: $cookTime)
                    .keyboardType(.numberPad)
                    .font(SavoroFonts.body)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Tags")
                    .font(SavoroFonts.caption)
                    .foregroundStyle(SavoroColors.textSecondary)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(RecipeTag.allCases, id: \.rawValue) { tag in
                            Button {
                                if selectedTags.contains(tag) {
                                    selectedTags.remove(tag)
                                } else {
                                    selectedTags.insert(tag)
                                }
                            } label: {
                                Label(tag.displayName, systemImage: tag.icon)
                                    .font(SavoroFonts.caption)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(selectedTags.contains(tag) ? SavoroColors.rose : SavoroColors.Stone.s100)
                                    .foregroundStyle(selectedTags.contains(tag) ? Color.white : SavoroColors.textSecondary)
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
        }
    }

    private var ingredientsSection: some View {
        Section("Ingredients") {
            if isLoadingIngredients {
                ProgressView()
                    .frame(maxWidth: .infinity)
            }
            ForEach($ingredientDrafts) { $ingredient in
                HStack {
                    TextField("Ingredient", text: $ingredient.label)
                        .font(SavoroFonts.body)

                    TextField("Qty", value: $ingredient.quantity, format: .number)
                        .keyboardType(.decimalPad)
                        .frame(width: 60)
                        .font(SavoroFonts.body)

                    TextField("Unit", text: Binding(
                        get: { ingredient.unit ?? "" },
                        set: { ingredient.unit = $0.isEmpty ? nil : $0 }
                    ))
                    .frame(width: 60)
                    .font(SavoroFonts.body)
                }
            }
            .onDelete(perform: deleteIngredient)
            .onMove(perform: moveIngredient)

            Button {
                ingredientDrafts.append(RecipeIngredientDraft(label: ""))
            } label: {
                Label("Add Ingredient", systemImage: "plus.circle")
                    .font(SavoroFonts.callout)
                    .foregroundStyle(SavoroColors.rose)
            }
        }
    }

    private var instructionsSection: some View {
        Section("Instructions") {
            TextEditor(text: $instructions)
                .font(SavoroFonts.body)
                .frame(minHeight: 120)
        }
    }

    private var settingsSection: some View {
        Section("Settings") {
            Toggle("Public recipe", isOn: $isPublic)
                .font(SavoroFonts.body)
        }
    }

    @ViewBuilder
    private var macroPreviewSection: some View {
        let linkedIngredients = ingredientDrafts.filter {
            !$0.label.trimmingCharacters(in: .whitespaces).isEmpty && $0.foodId != nil
        }
        if !linkedIngredients.isEmpty {
            Section("Nutrition (per serving)") {
                if let macros = livePerServingMacros {
                    HStack {
                        MacroLineView(protein: macros.protein, carb: macros.carb, fat: macros.fat)
                        Spacer()
                        if hasMacroGaps {
                            Text("Some macros unknown")
                                .font(SavoroFonts.caption)
                                .foregroundStyle(SavoroColors.textSecondary)
                        }
                    }
                } else {
                    Text("Macros unavailable")
                        .font(SavoroFonts.caption)
                        .foregroundStyle(SavoroColors.textSecondary)
                }
            }
        }
    }

    // MARK: - Macro Hydration

    private func hydrateIngredientMacros() async {
        let foodService = FoodService()
        // Collect unique foodIds that need fetching
        let uniqueFoodIds = Set(ingredientDrafts.compactMap(\.foodId))
            .filter { macroServingsCache[$0] == nil }

        if !uniqueFoodIds.isEmpty {
            await withTaskGroup(of: (String, [ServingSummary])?.self) { group in
                for foodId in uniqueFoodIds {
                    group.addTask {
                        guard let servings = try? await foodService.getServings(foodId: foodId) else {
                            return nil
                        }
                        return (foodId, servings)
                    }
                }
                for await result in group {
                    if let (foodId, servings) = result {
                        macroServingsCache[foodId] = servings
                    }
                }
            }
        }

        // Apply cached servings to each ingredient draft
        for index in ingredientDrafts.indices {
            let draft = ingredientDrafts[index]
            guard let foodId = draft.foodId,
                  let servings = macroServingsCache[foodId] else {
                continue
            }
            // Prefer matching servingId, then isDefault, then first
            let serving = servings.first { $0.id == draft.servingId }
                ?? servings.first { $0.isDefault == true }
                ?? servings.first
            ingredientDrafts[index].cachedProtein = serving?.protein
            ingredientDrafts[index].cachedCarb = serving?.carb
            ingredientDrafts[index].cachedFat = serving?.fat
        }
    }

    // MARK: - Actions

    private func deleteIngredient(at offsets: IndexSet) {
        ingredientDrafts.remove(atOffsets: offsets)
    }

    private func moveIngredient(from source: IndexSet, to destination: Int) {
        ingredientDrafts.move(fromOffsets: source, toOffset: destination)
    }

    private func save() async {
        isSaving = true
        errorMessage = nil

        let parsedTags = selectedTags.map(\.rawValue)

        let validIngredients = ingredientDrafts.filter {
            !$0.label.trimmingCharacters(in: .whitespaces).isEmpty
        }

        let draft = RecipeDraft(
            title: title.trimmingCharacters(in: .whitespaces),
            description: description.isEmpty ? nil : description,
            instructions: instructions.isEmpty ? nil : instructions,
            servings: servings,
            prepTime: Int(prepTime),
            cookTime: Int(cookTime),
            isPublic: isPublic,
            tags: parsedTags,
            ingredients: validIngredients
        )

        do {
            switch mode {
            case .create:
                _ = try await viewModel.createRecipe(draft)
            case .edit(let recipe):
                _ = try await viewModel.updateRecipe(recipe.id, draft)
            }
            dismiss()
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }

        isSaving = false
    }
}

#Preview {
    NavigationStack {
        RecipeEditorView(
            mode: .create,
            viewModel: CookbookViewModel()
        )
    }
}
