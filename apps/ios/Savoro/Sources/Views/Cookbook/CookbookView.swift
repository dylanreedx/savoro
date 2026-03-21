import SwiftUI

struct CookbookView: View {
    @State private var viewModel = CookbookViewModel()
    @State private var showEditor = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    recipeGrid
                    discoverSection
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 100) // FAB clearance
            }
            .background(SavoroColors.canvas)
            .navigationTitle("Cookbook")
            .searchable(
                text: $viewModel.searchText,
                prompt: "Search recipes"
            )
            .overlay(alignment: .bottomTrailing) {
                addButton
            }
            .sheet(isPresented: $showEditor) {
                NavigationStack {
                    RecipeEditorView(
                        mode: .create,
                        viewModel: viewModel
                    )
                }
            }
            .navigationDestination(for: Recipe.self) { recipe in
                RecipeDetailView(recipe: recipe, viewModel: viewModel)
            }
            .refreshable {
                await viewModel.loadRecipes()
            }
            .task {
                if viewModel.recipes.isEmpty {
                    await viewModel.loadRecipes()
                }
                if viewModel.discoverRecipes.isEmpty {
                    await viewModel.loadDiscover()
                }
            }
        }
    }

    // MARK: - Recipe Grid

    @ViewBuilder
    private var recipeGrid: some View {
        if viewModel.isLoading && viewModel.recipes.isEmpty {
            ProgressView()
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
        } else if let error = viewModel.error, viewModel.recipes.isEmpty {
            VStack(spacing: 8) {
                Text(error)
                    .font(SavoroFonts.callout)
                    .foregroundStyle(SavoroColors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 40)
        } else if viewModel.filteredRecipes.isEmpty && !viewModel.searchText.isEmpty {
            Text("No recipes match \"\(viewModel.searchText)\"")
                .font(SavoroFonts.callout)
                .foregroundStyle(SavoroColors.textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
        } else {
            LazyVGrid(
                columns: [GridItem(.flexible()), GridItem(.flexible())],
                spacing: 12
            ) {
                ForEach(viewModel.filteredRecipes) { recipe in
                    NavigationLink(value: recipe) {
                        RecipeCardView(recipe: recipe)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Discover Section

    @ViewBuilder
    private var discoverSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Discover")
                .font(SavoroFonts.headline)
                .foregroundStyle(SavoroColors.textPrimary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(RecipeTag.allCases, id: \.rawValue) { tag in
                        Button {
                            Task {
                                var updated = viewModel.discoverTagFilter
                                if updated.contains(tag) {
                                    updated.remove(tag)
                                } else {
                                    updated.insert(tag)
                                }
                                await viewModel.setDiscoverFilter(updated)
                            }
                        } label: {
                            Label(tag.displayName, systemImage: tag.icon)
                                .font(SavoroFonts.caption)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(viewModel.discoverTagFilter.contains(tag) ? SavoroColors.rose : SavoroColors.Stone.s100)
                                .foregroundStyle(viewModel.discoverTagFilter.contains(tag) ? Color.white : SavoroColors.textSecondary)
                                .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            if viewModel.isLoadingDiscover && viewModel.discoverRecipes.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
            } else if !viewModel.discoverRecipes.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 12) {
                        ForEach(viewModel.discoverRecipes) { recipe in
                            NavigationLink(value: recipe) {
                                RecipeCardView(recipe: recipe)
                                    .frame(width: 180)
                            }
                            .buttonStyle(.plain)
                        }

                        if viewModel.discoverCursor != nil {
                            ProgressView()
                                .frame(width: 44)
                                .task {
                                    await viewModel.loadMoreDiscover()
                                }
                        }
                    }
                    .padding(.horizontal, 1) // Prevent shadow clipping
                }
            }
        }
    }

    // MARK: - FAB

    private var addButton: some View {
        Button {
            showEditor = true
        } label: {
            Image(systemName: "plus")
                .font(.title2.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(SavoroColors.rose)
                .clipShape(Circle())
                .shadow(
                    color: SavoroColors.rose.opacity(0.35),
                    radius: 12,
                    y: 6
                )
        }
        .padding(.trailing, 20)
        .padding(.bottom, 24)
    }
}

#Preview {
    CookbookView()
}
