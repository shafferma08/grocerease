document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('imageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const imageUrl = document.getElementById('imageUrl').value;

        // Display the image being analyzed
        const imagePreview = document.getElementById('imagePreview');
        imagePreview.innerHTML = `<img src="${imageUrl}" alt="Analyzed Image" class="rounded-image">`;

        // Send the image URL to the backend for analysis
        const response = await fetch('/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl }),
        });
        const data = await response.json();

        // Display the results with checkboxes for selection
        const resultsElement = document.getElementById('results');
        resultsElement.innerHTML = ''; // Clear previous results
        const list = document.createElement('ul');
        data.concepts.forEach(concept => {
            const item = document.createElement('li');
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = concept.name;
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(`${concept.name} (Confidence: ${(concept.value * 100).toFixed(1)}%)`));
            item.appendChild(label);
            list.appendChild(item);
        });
        resultsElement.appendChild(list);
    });

    document.getElementById('get-recipe-suggestions').addEventListener('click', fetchRecipeSuggestions);


    // Handle adding selected items to the inventory
    document.getElementById('addToInventory').addEventListener('click', async () => {
        const checkedItems = document.querySelectorAll('#results input[type="checkbox"]:checked');

        // Prepare to add all checked items to the inventory with default quantity of 1
        const itemsToAdd = Array.from(checkedItems).map(item => {
            return { name: item.value, quantity: 1 }; // Assuming a default quantity of 1 for simplicity
        });

        // Add each item to the backend inventory
        for (const item of itemsToAdd) {
            await fetch('/add-to-inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
            });
        }

        // Clear the current selections
        checkedItems.forEach(checkbox => {
            checkbox.checked = false;
        });

        // Refresh the inventory list displayed on the frontend
        fetchInventory();
    });

    const recipeButton = document.getElementById('get-recipe-suggestions');
    if (recipeButton) {
        recipeButton.addEventListener('click', fetchRecipeSuggestions);
    }

    function fetchInventory() {
        fetch('/inventory')
            .then(response => response.json())
            .then(data => {
                const inventoryList = document.getElementById('inventoryList'); // Changed from 'inventory'
                inventoryList.innerHTML = ''; // Clear the list before appending new items
                data.inventory.forEach(item => {
                    const li = document.createElement('li');
                    li.className = "list-group-item d-flex justify-content-between align-items-center inventory-item";
                    li.innerHTML = `<span>${item.name} (Quantity: ${item.quantity})</span>`;
                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'btn btn-sm delete-btn';
                    deleteButton.textContent = 'Delete';
                    deleteButton.onclick = function() { deleteItem(item.name); };
                    li.appendChild(deleteButton);
                    inventoryList.appendChild(li); // Append the item to the list
                });
            })
            .catch(error => console.error('Error fetching inventory:', error));
    }
    
    function deleteItem(name) {
        fetch('/remove-from-inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        })
        .then(() => {
            fetchInventory(); // Refresh the inventory list
        })
        .catch(error => console.error('Error deleting item:', error));
    }

    function fetchRecipeSuggestions() {
        fetch('/suggest-recipes')
            .then(response => response.json())
            .then(recipes => {
                const recipesContainer = document.getElementById('recipes-container');
                // Clear the container and create a new row
                recipesContainer.innerHTML = '';
                const row = document.createElement('div');
                row.className = 'row';
                recipesContainer.appendChild(row); // Append the row to the container
    
                recipes.forEach(recipe => {
                    const recipeCol = document.createElement('div');
                    recipeCol.className = 'col-sm-12 col-md-6 col-lg-4 mb-4'; // Add bottom margin for spacing
                    // Use the sourceUrl if available, otherwise construct the URL
                    const recipeUrl = recipe.sourceUrl || `https://spoonacular.com/recipes/${recipe.title}-${recipe.id}`;
                    recipeCol.innerHTML = `
                        <div class="card bg-dark text-white">
                            <a href="${recipeUrl}" target="_blank">
                                <img src="${recipe.image}" class="card-img-top" alt="${recipe.title}">
                            </a>
                            <div class="card-body">
                                <h5 class="card-title">${recipe.title}</h5>
                                <a href="${recipeUrl}" target="_blank" class="btn btn-primary">View Recipe</a>
                            </div>
                        </div>
                    `;
                    row.appendChild(recipeCol); // Append the column to the row
                });
            })
            .catch(error => console.error('Error fetching recipe suggestions:', error));
    }
    
    // Call fetchInventory() to initially populate the inventory list and also after adding items
    fetchInventory();
    
})