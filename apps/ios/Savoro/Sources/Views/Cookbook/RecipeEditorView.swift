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
    @State private var tags: String
    @State private var ingredientDrafts: [RecipeIngredientDraft]

    @State private var isSaving = false
    @State private var errorMessage: String?

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
            _tags = State(initialValue: "")
            _ingredientDrafts = State(initialValue: [RecipeIngredientDraft(label: "")])
        case .edit(let recipe):
            _title = State(initialValue: recipe.title)
            _description = State(initialValue: recipe.description ?? "")
            _instructions = State(initialValue: recipe.instructions ?? "")
            _servings = State(initialValue: recipe.servings)
            _prepTime = State(initialValue: recipe.prepTime.map(String.init) ?? "")
            _cookTime = State(initialValue: recipe.cookTime.map(String.init) ?? "")
            _isPublic = State(initialValue: recipe.isPublic)
            _tags = State(initialValue: recipe.tags.joined(separator: ", "))
            _ingredientDrafts = State(initialValue: [RecipeIngredientDraft(label: "")])
        }
    }

    private var navigationTitle: String {
        switch mode {
        case .create: return "New Recipe"
        case .edit:   return "Edit Recipe"
        }
    }

    var body: some View {
        Form {
            detailsSection
            ingredientsSection
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

            TextField("Tags (comma-separated)", text: $tags)
                .font(SavoroFonts.body)
        }
    }

    private var ingredientsSection: some View {
        Section("Ingredients") {
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

        let parsedTags = tags
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

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
