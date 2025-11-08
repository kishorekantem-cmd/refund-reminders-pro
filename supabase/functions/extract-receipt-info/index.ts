import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing receipt image with OCR...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this receipt image and extract the following information in JSON format:
{
  "storeName": "name of the store",
  "purchaseDate": "date in MM/DD/YYYY format",
  "returnByDate": "return deadline date in MM/DD/YYYY format if mentioned",
  "amount": "total amount as a number"
}

CRITICAL INSTRUCTIONS FOR returnByDate:
1. First, look for explicit return deadline dates on the receipt
2. Look for phrases like "Return by [date]", "Exchange by [date]", "Must return by [date]"
3. Look for return policy text stating "Return within X days" - if found, calculate the date by adding X days to the purchase date
4. Check store policy information at the bottom of receipt - many stores print their return policy there
5. Look for fine print mentioning return windows (e.g., "30 day return policy", "Returns accepted within 60 days")
6. Common store policies: Target (90 days), Walmart (90 days), Amazon (30 days), Best Buy (15-30 days)
7. If you see the store name and recognize it, apply their standard return policy if no specific date is mentioned
8. If absolutely no return information is found anywhere, set to null

For other fields:
- Extract only the information present in the receipt
- Return ONLY the JSON object, no additional text
- Use null for any field that cannot be determined from the receipt`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_receipt_data",
              description: "Extract structured data from a receipt image",
              parameters: {
                type: "object",
                properties: {
                  storeName: { 
                    type: "string",
                    description: "Name of the store or merchant"
                  },
                  purchaseDate: { 
                    type: "string",
                    description: "Purchase date in MM/DD/YYYY format"
                  },
                  returnByDate: { 
                    type: ["string", "null"],
                    description: "Return deadline in MM/DD/YYYY format, or null if not found"
                  },
                  amount: { 
                    type: "number",
                    description: "Total purchase amount"
                  }
                },
                required: ["storeName", "purchaseDate", "amount"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_receipt_data" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    console.log("AI Response:", JSON.stringify(data, null, 2));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted receipt data:", extractedData);

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in extract-receipt-info:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to process receipt" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
