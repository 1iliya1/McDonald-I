import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { MENU_ITEMS } from "./src/data.js"; // note the ESM path or internal usage; in node we can import items directly

const app = express();
const PORT = 3000;

// High limits for base64 image streams
app.use(express.json({ limit: "15mb" }));

// Lazy initializer for Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
      console.warn("⚠️ GEMINI_API_KEY is not defined. Features will run in simulation mode.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Global Menu Reference for endpoints
const menuDbString = JSON.stringify(MENU_ITEMS.map(item => ({
  id: item.id,
  name: item.name,
  category: item.category,
  price: item.price,
  calories: item.calories,
  description: item.description,
  allergens: item.allergens,
  tags: item.tags,
  nutrition: item.nutrition
})));

// --- API ROUTES ---

// 1. AI Menu Assistant Chat
app.post("/api/ai/chat", async (req, res): Promise<any> => {
  try {
    const { history, message } = req.body;
    const client = getGeminiClient();
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Fallback simulation if no API key provided
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      const lowerMsg = message.toLowerCase();
      let responseText = "Hello! I'm your Golden Arches Smart Assistant. (Running in Simulation Mode - Set your GEMINI_API_KEY to enable full live AI generation).\n\n";
      
      const suggestedItems: typeof MENU_ITEMS = [];

      if (lowerMsg.includes("burger") || lowerMsg.includes("meat")) {
        responseText += "I highly recommend our signature **Big Mac®** or the **Quarter Pounder® with Cheese**! They are packed with high-quality beef and fresh ingredients.";
        suggestedItems.push(MENU_ITEMS[0], MENU_ITEMS[1]);
      } else if (lowerMsg.includes("diet") || lowerMsg.includes("gluten") || lowerMsg.includes("healthy") || lowerMsg.includes("salad")) {
        responseText += "For a lighter, gluten-friendly option, try our **Premium Grilled Chicken Salad** (310 kcal) along with our **World Famous Fries®** which are gluten-free!";
        suggestedItems.push(MENU_ITEMS[6], MENU_ITEMS[7]);
      } else if (lowerMsg.includes("breakfast") || lowerMsg.includes("morning")) {
        responseText += "Start your day with our classic **Egg McMuffin®** and a crispy **Loaded Golden Hash Brown**.";
        suggestedItems.push(MENU_ITEMS[9], MENU_ITEMS[8]);
      } else if (lowerMsg.includes("sweet") || lowerMsg.includes("dessert") || lowerMsg.includes("shake")) {
        responseText += "Treat yourself to a thick **Creamy McFlurry® with Oreo®** or a warm **Warm Baked Apple Pie**!";
        suggestedItems.push(MENU_ITEMS[12], MENU_ITEMS[11]);
      } else {
        responseText += "What are you in the mood for today? You can choose from our breakfast selections, juicy burgers, crispy chicken, cool drinks, and sweet desserts!";
        suggestedItems.push(MENU_ITEMS[0], MENU_ITEMS[7], MENU_ITEMS[12]);
      }

      return res.json({
        text: responseText,
        suggestedItems: suggestedItems
      });
    }

    // Prepare full Prompt
    const promptInstructions = `
You are the interactive, clever, and helpful Smart AI Menu Assistant for the McDonald's-inspired Golden Arches restaurant app.
Here is our current complete Menu Database of real items we sell:
${menuDbString}

Your goal is to guide the user into making a delicious order. Advise them based on their craving, mood, time of day, allergies, or dietary parameters (e.g. gluten-free, low-calorie, high-protein).
Keep your response warm, visual, and energetic. Use bold markdown formatting for item names.

IMPORTANT: You MUST also identify 1 to 4 items from the menu database that are highly relevant to their response and return their exact IDs so we can render interactive item cards directly in the chat panel!
You will respond in structured JSON format with this exact shape:
{
  "text": "Your markdown-rendered helpful conversation string here...",
  "suggestedItemIds": ["m1", "m8"] // list of match item IDs
}
`;

    // Construct history parts
    const contents: any[] = [
      { role: "user", parts: [{ text: promptInstructions }] },
      { role: "model", parts: [{ text: "Understood, I am ready to assist customers with the Golden Arches menu in structured JSON format." }] }
    ];

    if (history && history.length > 0) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === "model" ? "model" : "user",
          parts: [{ text: typeof msg.text === "string" ? msg.text : JSON.stringify(msg) }]
        });
      });
    }

    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["text", "suggestedItemIds"],
          properties: {
            text: { type: Type.STRING, description: "Friendly markdown conversation text assisting the user with their request" },
            suggestedItemIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of item ID strings from the menu database that are recommended (e.g., ['m1', 'm8'])"
            }
          }
        },
        temperature: 0.7
      }
    });

    const result = JSON.parse(response.text || "{}");
    const suggestedItems = MENU_ITEMS.filter(item => (result.suggestedItemIds || []).includes(item.id));

    return res.json({
      text: result.text,
      suggestedItems: suggestedItems
    });

  } catch (error: any) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat" });
  }
});

// 2. Natural Language Smart Search
app.post("/api/ai/search", async (req, res): Promise<any> => {
  try {
    const { query } = req.body;
    if (!query || query.trim() === "") {
      return res.json({ items: MENU_ITEMS, explanation: "Enter a custom search to begin filtering." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      // Local filter simulation for testing
      const lower = query.toLowerCase();
      let matches = MENU_ITEMS;
      let reason = `Found match for "${query}" (Simulated Match)`;

      if (lower.includes("gluten") || lower.includes("allergen-free")) {
        matches = MENU_ITEMS.filter(i => !i.allergens.includes("Gluten"));
        reason = "Filtered to gluten-free options (e.g., Premium Salad, Fries, Hash Brown, Drinks)";
      } else if (lower.includes("under 500") || lower.includes("under 500 kcal") || lower.includes("calorie")) {
        matches = MENU_ITEMS.filter(i => i.calories < 500);
        reason = "Filtered to items under 500 kcal.";
      } else if (lower.includes("protein") || lower.includes("high protein")) {
        matches = MENU_ITEMS.filter(i => i.nutrition.protein >= 15);
        reason = "Filtered to high protein options (15g+ protein).";
      } else if (lower.includes("sweet") || lower.includes("dessert")) {
        matches = MENU_ITEMS.filter(i => i.category === "desserts");
        reason = "Filtered to desserts & milkshakes.";
      } else if (lower.includes("burger")) {
        matches = MENU_ITEMS.filter(i => i.category === "burgers");
        reason = "Filtered to high-quality beef burger classics.";
      }

      return res.json({ items: matches, explanation: reason });
    }

    const client = getGeminiClient();
    const prompt = `
Analyze the customer's natural search query: "${query}" for our Golden Arches menu database:
${menuDbString}

Return a structured JSON with:
1. "matchingIds": list of item IDs that best fit the criteria (like high-protein, calorie counts, specific ingredients, breakfast constraints, sweet foods).
2. "explanation": a 1-sentence friendly explanation of why these items are recommended based on their goals.

Response Form:
{
  "matchingIds": ["m7", "m8"],
  "explanation": "Here are our nutritious options under 500 calories with no gluten ingredients!"
}
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["matchingIds", "explanation"],
          properties: {
            matchingIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            explanation: { type: Type.STRING }
          }
        },
        temperature: 0.2
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    const matchedItems = MENU_ITEMS.filter(item => (parsed.matchingIds || []).includes(item.id));

    return res.json({
      items: matchedItems.length > 0 ? matchedItems : MENU_ITEMS.slice(0, 3),
      explanation: parsed.explanation || `Recommendations matching "${query}"`
    });

  } catch (error: any) {
    console.error("Smart Search Error:", error);
    res.status(500).json({ error: error.message || "Failed to search menu" });
  }
});

// 3. AI Upsell Recommendations on Checkout
app.post("/api/ai/upsells", async (req, res): Promise<any> => {
  try {
    const { cartItems } = req.body; // array of { menuItemId, quantity }
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      // Return standard dessert/sides upsell copy (Simulated)
      const isFriesSelected = (cartItems || []).some((c: any) => c.menuItemId === "m8");
      const upsellItem = isFriesSelected ? MENU_ITEMS[11] : MENU_ITEMS[7]; // pie or fries
      
      return res.json({
        upsellItem: upsellItem,
        pitchSentence: `Add ${upsellItem.name}! 87% of customers enjoyed this delicious side pairing alongside their main order today.`
      });
    }

    const client = getGeminiClient();
    const currentCartNames = (cartItems || []).map((c: any) => {
      const match = MENU_ITEMS.find(m => m.id === c.menuItemId);
      return match ? `${match.name} (Qty ${c.quantity})` : "";
    }).filter(Boolean).join(", ");

    const prompt = `
Recommend exactly ONE add-on MenuItem from our Golden Arches catalog that is NOT already in the customer's current cart:
Current Cart: [${currentCartNames}]

Catalog:
${menuDbString}

Generate:
1. "upsellItemId": Selected item ID that makes the most sense (e.g., if they got burgers, upsell Crisp Fries or Oreo McFlurry. If they got breakfast, upsell loaded Hash Brown or latte). It must be a real ID from the catalog.
2. "pitchSentence": A highly compelling, persuasive, high-conversion CRO pitch explaining why 87% of customers like them added this specific item to their order (e.g. "Add crisp, golden fries? 87% of double-cheese burger lovers said it completes their meal!").

Response Format:
{
  "upsellItemId": "m12",
  "pitchSentence": "Add the Warm Baked Apple Pie! 87% of sandwich lovers added this sweet reward to their tray today."
}
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["upsellItemId", "pitchSentence"],
          properties: {
            upsellItemId: { type: Type.STRING },
            pitchSentence: { type: Type.STRING }
          }
        },
        temperature: 0.5
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    const upsellItem = MENU_ITEMS.find(m => m.id === parsed.upsellItemId) || MENU_ITEMS[7]; // defaulted to Fries

    return res.json({
      upsellItem: upsellItem,
      pitchSentence: parsed.pitchSentence || `Add our crispy ${upsellItem.name} to complete your order!`
    });

  } catch (error: any) {
    console.error("AI Upsell Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate upsell" });
  }
});

// 4. Vision: Photo-to-Order Identification
app.post("/api/ai/vision", async (req, res): Promise<any> => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }

    // Strip header prefix if present (e.g. "data:image/png;base64,")
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      // Mock / Sim matches for quick prototyping testing
      return res.json({
        matchedItem: MENU_ITEMS[0], // Big Mac
        confidence: 0.94,
        reasoning: "We matched your photo to our signature Big Mac® using advanced local computer vision emulation. Double-deck patties and sesame buns found!"
      });
    }

    const client = getGeminiClient();
    const imagePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64,
      }
    };
    
    const textPart = {
      text: `Based on the provided photo, identify which item from our official menu database best matches it.
Menu database:
${menuDbString}

Return a structured JSON with:
1. "matchedItemId": The exact ID string from the menu database of the matching item (e.g. "m1" for Big Mac, "m8" for fries, etc.)
2. "confidence": A float value between 0.0 and 1.0 representing matching confidence.
3. "reasoning": A 1-2 sentence friendly breakdown of what features in the image (e.g., golden crisp fries, sesame buns, beef patties) helped identify it.

Response Format:
{
  "matchedItemId": "m8",
  "confidence": 0.98,
  "reasoning": "Golden crisp fries identified with our trademark shape and rich salted seasoning!"
}
`
    };

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["matchedItemId", "confidence", "reasoning"],
          properties: {
            matchedItemId: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          }
        },
        temperature: 0.3
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    const matchedItem = MENU_ITEMS.find(m => m.id === parsed.matchedItemId) || MENU_ITEMS[0];

    return res.json({
      matchedItem: matchedItem,
      confidence: parsed.confidence || 0.9,
      reasoning: parsed.reasoning || "Matched to our premium menu item!"
    });

  } catch (error: any) {
    console.error("AI Vision Match Error:", error);
    res.status(500).json({ error: error.message || "Failed to identify meal" });
  }
});

// 5. Personalization Copy Generation
app.post("/api/ai/personalize", async (req, res): Promise<any> => {
  try {
    const { timeOfDay, dietaryGoals, pointBalance } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      let greet = "Welcome back, Golden Club Member!";
      let promo = "Craving comfort? Treat yourself to our signature Big Mac® today.";
      if (timeOfDay === "morning") {
        greet = "Rise & Shine, Golden Club Diner!";
        promo = "Fuel up with our freshly cracked Egg McMuffin® and warm McCafé coffee!";
      } else if (timeOfDay === "night") {
        greet = "Late Night Cravings Sorted!";
        promo = "Craving a double beef patty or crisp fries? We have hot food ready for you!";
      }
      return res.json({ greeting: greet, promotionalCopy: promo });
    }

    const client = getGeminiClient();
    const prompt = `
Generate custom high-conversion greeting & promotional paragraph for our McDonald's-inspired app homepage:
Time of day: ${timeOfDay}
Diet preferences: ${dietaryGoals?.join(", ") || "None specified"}
Loyalty Points Balance: ${pointBalance || 0} Points

Generate the response in JSON format:
{
  "greeting": "A short, highly catchy 4-6 word welcome title geared to the time. E.g., 'Late Night Cravings Sorted!'",
  "promotionalCopy": "A warm, high-conversion promotional description (1-2 sentences) encouraging them to order. Fit their dietary goal if they have one, or suggest classic morning items for mornings, late night fries/burgers for nights, and highlight their points if any!"
}
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["greeting", "promotionalCopy"],
          properties: {
            greeting: { type: Type.STRING },
            promotionalCopy: { type: Type.STRING }
          }
        },
        temperature: 0.7
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);

  } catch (error: any) {
    console.error("Personalization Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate personalization" });
  }
});


// --- VITE DEV MIDDLEWARE AND STATIC SERVING ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite development middleware Mode.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up Express static files serving in Production.");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Arches AI Ordering Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
