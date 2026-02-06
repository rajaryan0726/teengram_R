const AI_API_ROUTE = '/api/ai'; // Your general-purpose route

export const sendPrompt = async (prompt) => {
    try {
        const response = await fetch(AI_API_ROUTE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `AI service responded with status ${response.status}.`);
        }

        const data = await response.json();
        return data.reply; // Returns the clean reply string
        
    } catch (error) {
        console.error("sendPrompt Error:", error);
        return null; 
    }
};