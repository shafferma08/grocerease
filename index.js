import express from 'express';
import { ClarifaiStub, grpc } from "clarifai-nodejs-grpc";
import bodyParser from 'body-parser';
import { addToInventory, listInventory, removeFromInventory, getInventoryItemNames } from './db/database.js'; 
import fetch from 'node-fetch'; 
import dotenv from 'dotenv';

dotenv.config();
// comment change
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const SPOONACULAR_API_URL = 'https://api.spoonacular.com/recipes/findByIngredients';

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Serve static HTML page
app.use(express.static('public'));

const PAT = process.env.PAT;
const USER_ID = process.env.USER_ID;
const APP_ID = process.env.APP_ID;
const MODEL_ID = process.env.MODEL_ID;

const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
metadata.set("authorization", "Key " + PAT);

// Endpoint to analyze image URL
app.post('/analyze-image', (req, res) => {
    const imageUrl = req.body.imageUrl;
    stub.PostModelOutputs(
        {
            user_app_id: { user_id: USER_ID, app_id: APP_ID },
            model_id: MODEL_ID,
            inputs: [{ data: { image: { url: imageUrl } } }]
        },
        metadata,
        (err, response) => {
            if (err) {
                console.error("Error:", err);
                return res.status(500).send({ error: "Error processing the image" });
            }

            if (response.status.code !== 10000) {
                console.error("API call failed:", response.status.description);
                return res.status(500).send({ error: "Post model outputs failed, status: " + response.status.description });
            }

            // Filter concepts by probability
            const filteredConcepts = response.outputs[0].data.concepts.filter(concept => concept.value >= 0.5);
            res.send({ concepts: filteredConcepts });
        }
    );
});

// Endpoint to add an item to the inventory
app.post('/add-to-inventory', (req, res) => {
    const { name, quantity } = req.body;
    addToInventory(name, quantity);
    res.send({ message: 'Item added to inventory' });
  });
  
  // Endpoint to list inventory items
  app.get('/inventory', (req, res) => {
    listInventory((err, rows) => {
      if (err) {
        res.status(500).send('Error fetching inventory');
        return;
      }
      res.send({ inventory: rows });
    });
  });

  // Endpoint to delete an item from the inventory by name
app.post('/remove-from-inventory', (req, res) => {
    const { name } = req.body; // Assuming each item is uniquely identified by its name
    removeFromInventory(name, (err) => {
        if (err) {
            res.status(500).send('Error deleting item from inventory');
        } else {
            res.send({ message: 'Item deleted from inventory' });
        }
    });
});

// Define this function to get inventory items
async function getInventoryItems() {
  try {
      const itemNames = await getInventoryItemNames();
      return itemNames;
  } catch (err) {
      console.error('Error fetching inventory items:', err);
      return []; // Return an empty array if there's an error
  }
}


// Function to search for recipes by ingredients
function searchRecipesByIngredients(ingredients) {
    // Convert array of ingredients into a comma-separated list
    const ingredientsList = ingredients.join(',');
  
    // Create the URL with query parameters
    const url = `${SPOONACULAR_API_URL}?ingredients=${encodeURIComponent(ingredientsList)}&apiKey=${SPOONACULAR_API_KEY}&number=5`;
  
    // Make the API request
    return fetch(url)
      .then(response => response.json())
      .then(recipes => {
        // Process the recipes here
        return recipes;  // This will be an array of recipe suggestions
      })
      .catch(error => {
        console.error('Error fetching recipes from Spoonacular:', error);
      });
  }
  
  // Usage with Express.js route
  app.get('/suggest-recipes', async (req, res) => {
    // Assume getInventoryItems() is a function that returns an array of ingredient names
    const inventoryItems = await getInventoryItems();
  
    // Search for recipes using inventory items
    searchRecipesByIngredients(inventoryItems)
      .then(recipes => {
        res.json(recipes);  // Send the recipes to the frontend
      })
      .catch(error => {
        res.status(500).json({ error: 'Failed to fetch recipes' });
      });
  });

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
